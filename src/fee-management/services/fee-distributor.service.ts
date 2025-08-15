import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { Connection, PublicKey, Keypair, Transaction as SolanaTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  createBurnInstruction,
  getAssociatedTokenAddress,
  getAccount,
  getMint,
} from '@solana/spl-token';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { BurnTracker } from '../entities/burn-tracker.entity';
import { D1cWalletService } from '../../d1c-wallet/d1c-wallet.service';

import {
  D1C_FEE_PERCENTAGE_FOR_COLLEGE,
  D1C_FEE_PERCENTAGE_TO_BURN
} from '../../utils/fees';

export interface DistributionResult {
  success: boolean;
  transactionsProcessed: number;
  opsAmount: number;
  collegeAmount: number;
  burnedAmount: number;
  errors: string[];
  signatures: string[];
}

export interface FeeDistribution {
  collegeWallet: string;
  collegeAmount: number;
  burnAmount: number;
}

@Injectable()
export class FeeDistributorService {
  private readonly logger = new Logger(FeeDistributorService.name);
  private readonly connection: Connection;
  private readonly mintPublicKey: PublicKey;
  private readonly opsWalletKeypair: Keypair;
  private readonly opsWalletAddress: string;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(BurnTracker)
    private readonly burnTrackerRepository: Repository<BurnTracker>,
    private readonly configService: ConfigService,
    private readonly d1cWalletService: D1cWalletService,
  ) {
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL') || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpcUrl, 'confirmed');

    const mintAddress = this.configService.get<string>('TOKEN_MINT_ADDRESS');
    if (!mintAddress) {
      throw new Error('TOKEN_MINT_ADDRESS not configured');
    }
    this.mintPublicKey = new PublicKey(mintAddress);

    const opsWalletSecret = this.configService.get<string>('OPS_WALLET_SECRET_KEY');
    if (!opsWalletSecret) {
      throw new Error('OPS_WALLET_SECRET_KEY not configured');
    }
    this.opsWalletKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(opsWalletSecret))
    );
    this.opsWalletAddress = this.opsWalletKeypair.publicKey.toString();
  }

  private mintDecimals: number | null = null;
  private static readonly ANNUAL_BURN_CAP_TOKENS = 100_000; // 100k tokens per period

  /**
   * Distribute fees from OPS wallet to college/community wallets and burn
   */
  async distributeFees(): Promise<DistributionResult> {
    const result: DistributionResult = {
      success: true,
      transactionsProcessed: 0,
      opsAmount: 0,
      collegeAmount: 0,
      burnedAmount: 0,
      errors: [],
      signatures: [],
    };

    try {
      // Get OPS wallet token account
      const opsTokenAccount = await getAssociatedTokenAddress(
        this.mintPublicKey,
        this.opsWalletKeypair.publicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Get all harvested transactions that haven't been distributed yet, excluding OPS wallet transactions
      const harvestedNotDistributedTransactions = await this.transactionRepository.find({
        where: {
          fee_harvested: true,
          fee_distributed: false,
          from: Not(this.opsWalletAddress)  // Exclude transactions sent by OPS wallet
        },
        relations: ['linkedCollege'],
        order: { timestamp: 'ASC' },
      });

      this.logger.log(`Found ${harvestedNotDistributedTransactions.length} harvested transactions ready for distribution`);

      if (harvestedNotDistributedTransactions.length === 0) {
        result.success = false;
        result.errors.push('No harvested transactions ready for distribution');
        return result;
      }

      // Group transactions by fee distribution requirements
      const distributions = await this.calculateDistributions(harvestedNotDistributedTransactions);

      // Execute distributions from OPS wallet
      for (const distribution of distributions) {
        try {
          const signatures = await this.executeDistribution(opsTokenAccount.toString(), distribution);
          result.signatures.push(...signatures);
          result.collegeAmount += distribution.collegeAmount;
          result.burnedAmount += distribution.burnAmount;
        } catch (error) {
          const errorMsg = `Failed to execute distribution: ${error.message}`;
          this.logger.error(errorMsg);
          result.success = false;
          result.errors.push(errorMsg);
        }
      }

      // Mark transactions as distributed after successful distribution
      if (result.signatures.length > 0) {
        const transactionIds = harvestedNotDistributedTransactions.map(t => t.id);
        await this.transactionRepository.update(
          transactionIds,
          { fee_distributed: true }
        );
        this.logger.log(`Marked ${transactionIds.length} transactions as fee_distributed`);
      }

      result.transactionsProcessed = harvestedNotDistributedTransactions.length;

    } catch (error) {
      this.logger.error('Error in distributeFees:', error);
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Calculate fee distributions based on transactions (OPS fees already collected in harvesting)
   */
  private async calculateDistributions(transactions: Transaction[]): Promise<FeeDistribution[]> {
    const distributions = new Map<string, FeeDistribution>();

    // Get Community wallet address
    const communityWallet = await this.d1cWalletService.getCommunityWallet();

    if (!communityWallet) {
      throw new Error('Community wallet not configured');
    }
    console.log({ transactions });

    for (const transaction of transactions) {
      const totalFee = transaction.amount;

      // Calculate fee breakdown (OPS fees are already collected during harvesting)
      // Only distribute college/community fees (2%) and burn (0.5%)
      const collegeAmount = totalFee * D1C_FEE_PERCENTAGE_FOR_COLLEGE;
      const burnAmount = totalFee * D1C_FEE_PERCENTAGE_TO_BURN;

      // Determine college wallet (linked college or community)
      let collegeWalletAddress = communityWallet;
      if (transaction.linkedCollege?.walletAddress) {
        collegeWalletAddress = transaction.linkedCollege.walletAddress;
      }

      // Create distribution key based on college wallet
      const distributionKey = collegeWalletAddress;

      if (!distributions.has(distributionKey)) {
        distributions.set(distributionKey, {
          collegeWallet: collegeWalletAddress,
          collegeAmount: 0,
          burnAmount: 0,
        });
      }

      const distribution = distributions.get(distributionKey)!;
      distribution.collegeAmount += collegeAmount;
      distribution.burnAmount += burnAmount;
    }

    return Array.from(distributions.values());
  }

  /**
   * Execute a single fee distribution (college/community + burn only)
   */
  private async executeDistribution(
    sourceTokenAccount: string,
    distribution: FeeDistribution
  ): Promise<string[]> {
    const signatures: string[] = [];

    try {
      // Enforce burn cap per active period: burn all or none
      let shouldBurn = false;
      if (distribution.burnAmount > 0) {
        shouldBurn = await this.canBurnFullAmountThisPeriod(distribution.burnAmount);
      }

      // If burning is disallowed this period, add the entire burn amount to the college transfer
      const collegeTransferAmount = distribution.collegeAmount + (shouldBurn ? 0 : distribution.burnAmount);
      if (collegeTransferAmount > 0) {
        const collegeSignature = await this.transferTokens(
          sourceTokenAccount,
          distribution.collegeWallet,
          collegeTransferAmount
        );
        signatures.push(collegeSignature);
        this.logger.log(`Transferred ${collegeTransferAmount} tokens to college/community wallet: ${collegeSignature}`);
      }

      // Burn entire amount if allowed and update tracker
      if (shouldBurn) {
        const burnSignature = await this.burnTokens(
          sourceTokenAccount,
          distribution.burnAmount
        );
        signatures.push(burnSignature);
        await this.incrementPeriodBurn(distribution.burnAmount);
        this.logger.log(`Burned ${distribution.burnAmount} tokens: ${burnSignature}`);
      }

    } catch (error) {
      this.logger.error('Error executing distribution:', error);
      throw error;
    }

    return signatures;
  }

  /**
   * Transfer tokens to a destination wallet
   */
  private async transferTokens(
    sourceAccount: string,
    destinationWallet: string,
    amount: number
  ): Promise<string> {
    try {
      const sourcePublicKey = new PublicKey(sourceAccount);
      const destinationWalletPublicKey = new PublicKey(destinationWallet);
      const amountBaseUnits = await this.toBaseUnits(amount);

      // Get or create associated token account for destination
      const destinationTokenAccount = await getAssociatedTokenAddress(
        this.mintPublicKey,
        destinationWalletPublicKey,
        false,
        TOKEN_2022_PROGRAM_ID
      );

      // Create transaction
      const transaction = new SolanaTransaction();

      // Check if destination token account exists
      try {
        await getAccount(this.connection, destinationTokenAccount, 'confirmed', TOKEN_2022_PROGRAM_ID);
      } catch (error) {
        // Account doesn't exist, need to create it
        const createATAInstruction = createAssociatedTokenAccountInstruction(
          this.opsWalletKeypair.publicKey, // Payer (OPS wallet)
          destinationTokenAccount,
          destinationWalletPublicKey, // Owner
          this.mintPublicKey,
          TOKEN_2022_PROGRAM_ID
        );
        transaction.add(createATAInstruction);
      }

      const transferInstruction = createTransferCheckedInstruction(
        sourcePublicKey,
        this.mintPublicKey,
        destinationTokenAccount,
        this.opsWalletKeypair.publicKey,
        amountBaseUnits,
        await this.getMintDecimals(),
        [],
        TOKEN_2022_PROGRAM_ID
      );



      transaction.add(transferInstruction);

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.opsWalletKeypair], // OPS wallet as signer
        { commitment: 'confirmed' }
      );

      return signature;
    } catch (error) {
      throw new Error(`Failed to transfer tokens: ${error.message}`);
    }
  }

  /**
   * Burn tokens from source account
   */
  private async burnTokens(sourceAccount: string, amount: number): Promise<string> {
    try {
      const sourcePublicKey = new PublicKey(sourceAccount);
      const amountBaseUnits = await this.toBaseUnits(amount);

      const transaction = new SolanaTransaction();

      // Add burn instruction
      const burnInstruction = createBurnInstruction(
        sourcePublicKey, // Token account (OPS wallet token account)
        this.mintPublicKey, // Mint
        this.opsWalletKeypair.publicKey, // Owner (OPS wallet)
        amountBaseUnits,
        undefined, // Multiselect
        TOKEN_2022_PROGRAM_ID
      );

      transaction.add(burnInstruction);

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.opsWalletKeypair], // OPS wallet as signer
        { commitment: 'confirmed' }
      );

      return signature;
    } catch (error) {
      throw new Error(`Failed to burn tokens: ${error.message}`);
    }
  }

  private async getOrCreateCurrentPeriod(): Promise<BurnTracker> {
    // Find the most recent period
    let latest = await this.burnTrackerRepository
      .createQueryBuilder('bt')
      .orderBy('bt.periodStartAt', 'DESC')
      .getOne();

    const now = new Date();

    if (!latest) {
      // First ever period starts now
      latest = this.burnTrackerRepository.create({ periodStartAt: now, burnedAmount: 0 });
      latest = await this.burnTrackerRepository.save(latest);
      return latest;
    }

    // Roll forward to the correct period if one or more full years have passed since periodStartAt
    const addYearsUtc = (date: Date, years: number) => {
      const d = new Date(date.getTime());
      d.setUTCFullYear(d.getUTCFullYear() + years);
      return d;
    };

    let rolledStart = new Date(latest.periodStartAt);
    while (now >= addYearsUtc(rolledStart, 1)) {
      rolledStart = addYearsUtc(rolledStart, 1);
    }

    // If we advanced to a new period boundary, create a new row starting exactly on the anniversary
    if (rolledStart.getTime() !== new Date(latest.periodStartAt).getTime()) {
      const newPeriod = this.burnTrackerRepository.create({ periodStartAt: rolledStart, burnedAmount: 0 });
      return await this.burnTrackerRepository.save(newPeriod);
    }

    return latest;
  }

  private async canBurnFullAmountThisPeriod(requestedBurn: number): Promise<boolean> {
    const period = await this.getOrCreateCurrentPeriod();
    const alreadyBurned = Number(period.burnedAmount ?? 0);
    return alreadyBurned + requestedBurn <= FeeDistributorService.ANNUAL_BURN_CAP_TOKENS;
  }

  private async incrementPeriodBurn(amountBurned: number): Promise<void> {
    const period = await this.getOrCreateCurrentPeriod();
    period.burnedAmount = Number(period.burnedAmount ?? 0) + amountBurned;
    await this.burnTrackerRepository.save(period);
  }

  private async getMintDecimals(): Promise<number> {
    if (this.mintDecimals !== null) return this.mintDecimals;
    const mintInfo = await getMint(
      this.connection,
      this.mintPublicKey,
      'confirmed',
      TOKEN_2022_PROGRAM_ID
    );
    this.mintDecimals = mintInfo.decimals;
    return this.mintDecimals;
  }

  private async toBaseUnits(amount: number): Promise<bigint> {
    const decimals = await this.getMintDecimals();
    // Avoid float artifacts like 18.380000000000003 by flooring after scaling.
    const factor = 10 ** decimals;
    const scaled = Math.floor(amount * factor + 1e-9);
    return BigInt(scaled);
  }

  /**
   * Get the total amount of fees available for distribution (college + burn portions only)
   */
  async getTotalFeesForDistribution(): Promise<number> {
    const harvestedNotDistributedTransactions = await this.transactionRepository.find({
      where: {
        fee_harvested: true,
        fee_distributed: false,
        from: Not(this.opsWalletAddress)
      },
      select: ['amount'],
    });

    // Only college (2%) + burn (0.5%) = 2.5% of transaction amount
    const distributionPercentage = D1C_FEE_PERCENTAGE_FOR_COLLEGE + D1C_FEE_PERCENTAGE_TO_BURN;

    return harvestedNotDistributedTransactions.reduce((total, transaction) =>
      total + (transaction.amount * distributionPercentage), 0
    );
  }

  /**
   * Get distribution summary for reporting
   */
  async getDistributionSummary(): Promise<{
    totalTransactionAmount: number;
    collegeAmount: number;
    burnAmount: number;
    communityAmount: number;
    linkedCollegeAmount: number;
  }> {
    const harvestedNotDistributedTransactions = await this.transactionRepository.find({
      where: {
        fee_harvested: true,
        fee_distributed: false,
        from: Not(this.opsWalletAddress)
      },
      relations: ['linkedCollege'],
    });

    let totalTransactionAmount = 0;
    let linkedCollegeAmount = 0;
    let communityAmount = 0;

    for (const transaction of harvestedNotDistributedTransactions) {
      totalTransactionAmount += transaction.amount;

      const collegeAmount = transaction.amount * D1C_FEE_PERCENTAGE_FOR_COLLEGE;

      if (transaction.linkedCollege?.walletAddress) {
        linkedCollegeAmount += collegeAmount;
      } else {
        communityAmount += collegeAmount;
      }
    }

    const burnAmount = totalTransactionAmount * D1C_FEE_PERCENTAGE_TO_BURN;

    return {
      totalTransactionAmount,
      collegeAmount: linkedCollegeAmount + communityAmount,
      burnAmount,
      communityAmount,
      linkedCollegeAmount,
    };
  }

  /**
   * Preview fee distribution without executing
   */
  async previewDistribution(): Promise<FeeDistribution[]> {
    const harvestedNotDistributedTransactions = await this.transactionRepository.find({
      where: {
        fee_harvested: true,
        fee_distributed: false,
        from: Not(this.opsWalletAddress)
      },
      relations: ['linkedCollege'],
      order: { timestamp: 'ASC' },
    });

    if (harvestedNotDistributedTransactions.length === 0) {
      return [];
    }

    return await this.calculateDistributions(harvestedNotDistributedTransactions);
  }

  /**
   * Get transactions ready for fee distribution (excluding OPS wallet transactions)
   */
  async getTransactionsForDistribution(limit: number = 100): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: {
        fee_harvested: true,
        fee_distributed: false,
        from: Not(this.opsWalletAddress)
      },
      relations: ['linkedCollege'],
      order: { timestamp: 'ASC' },
      take: limit,
    });
  }

  /**
   * Get count of transactions ready for distribution (excluding OPS wallet transactions)
   */
  async getTransactionsReadyForDistributionCount(): Promise<number> {
    return await this.transactionRepository.count({
      where: {
        fee_harvested: true,
        fee_distributed: false,
        from: Not(this.opsWalletAddress)
      },
    });
  }

  /**
   * Manually mark transactions as fee_distributed (for testing or manual intervention)
   */
  async markTransactionsAsDistributed(transactionIds: number[]): Promise<void> {
    await this.transactionRepository.update(
      transactionIds,
      { fee_distributed: true }
    );

    this.logger.log(`Manually marked ${transactionIds.length} transactions as fee_distributed`);
  }
}