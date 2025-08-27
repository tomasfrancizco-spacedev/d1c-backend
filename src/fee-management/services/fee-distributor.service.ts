import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection, PublicKey, Keypair, Transaction as SolanaTransaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createBurnInstruction,
  createMintToInstruction,
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
  private readonly mintAuthorityKeypair: Keypair;

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

    const mintAuthoritySecret = this.configService.get<string>('MINT_AUTHORITY_SECRET_KEY');
    if (!mintAuthoritySecret) {
      throw new Error('MINT_AUTHORITY_SECRET_KEY not configured');
    }
    this.mintAuthorityKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(mintAuthoritySecret))
    );
  }

  private mintDecimals: number | null = null;
  private static readonly ANNUAL_BURN_CAP_TOKENS = 100_000; // 100k tokens per period

  /**
   * Precision-safe percentage calculation using basis points to avoid floating-point errors
   */
  private calculatePercentage(amount: number, percentage: number): number {
    // Convert percentage to basis points (0.02 -> 200) to avoid floating-point multiplication
    const basisPoints = Math.round(percentage * 10000);
    return Math.floor((amount * basisPoints * 100000000)) / 100000000 / 10000;
  }

  /**
   * Distribute fees from OPS wallet to college/community wallets and burn
   */
  async distributeFeesFromTransactions(): Promise<DistributionResult> {
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

      // Get all harvested transactions that haven't been distributed yet
      const harvestedNotDistributedTransactions = await this.transactionRepository.find({
        where: {
          fee_harvested: true,
          fee_distributed: false,
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

      // Execute all distributions in optimized batches
      try {
        const signatures = await this.executeDistributionsBatched(opsTokenAccount.toString(), distributions);
        result.signatures.push(...signatures);

        // Calculate totals
        for (const distribution of distributions) {
          result.collegeAmount += distribution.collegeAmount;
          result.burnedAmount += distribution.burnAmount;
        }
      } catch (error) {
        const errorMsg = `Failed to execute batched distributions: ${error.message}`;
        this.logger.error(errorMsg);
        result.success = false;
        result.errors.push(errorMsg);
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
      this.logger.error('Error in distributeFeesFromTransactions:', error);
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

    for (const transaction of transactions) {
      const totalFee = transaction.amount;

      // Calculate fee breakdown using precision-safe method
      const collegeAmount = this.calculatePercentage(totalFee, D1C_FEE_PERCENTAGE_FOR_COLLEGE);
      const burnAmount = this.calculatePercentage(totalFee, D1C_FEE_PERCENTAGE_TO_BURN);

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
 * Execute all distributions using optimized batching (MUCH faster)
 */
  private async executeDistributionsBatched(
    sourceTokenAccount: string,
    distributions: FeeDistribution[]
  ): Promise<string[]> {
    const signatures: string[] = [];

    if (distributions.length === 0) {
      return signatures;
    }

    try {
      // Step 1: Calculate totals and determine burn eligibility
      let totalDeflationaryBurn = 0;
      const mintOperations: Array<{ wallet: string; amount: number }> = [];

      for (const distribution of distributions) {
        totalDeflationaryBurn += distribution.burnAmount;
      }

      const shouldBurn = totalDeflationaryBurn > 0 ?
        await this.canBurnFullAmountThisPeriod(totalDeflationaryBurn) : false;

      // Step 2: Prepare mint operations
      for (const distribution of distributions) {
        const collegeMintAmount = distribution.collegeAmount + (shouldBurn ? 0 : distribution.burnAmount);
        if (collegeMintAmount > 0) {
          mintOperations.push({
            wallet: distribution.collegeWallet,
            amount: collegeMintAmount
          });
        }
      }

      // Step 3: Execute ALL mints in parallel (HUGE performance gain!)
      if (mintOperations.length > 0) {
        this.logger.log(`Starting parallel mint to ${mintOperations.length} college wallets...`);

        const mintPromises = mintOperations.map(op =>
          this.mintTokensToCollege(op.wallet, op.amount)
        );

        const mintSignatures = await Promise.all(mintPromises);
        signatures.push(...mintSignatures);

        const totalMinted = mintOperations.reduce((sum, op) => sum + op.amount, 0);
        this.logger.log(`✅ Parallel minting completed! Minted ${totalMinted} tokens to ${mintOperations.length} wallets`);
      }

      // Step 4: Execute batched burns (single transaction)
      const totalCollegeBurn = distributions.reduce((sum, d) => sum + d.collegeAmount, 0);
      const totalBurnAmount = totalCollegeBurn + (shouldBurn ? totalDeflationaryBurn : 0);

      if (totalBurnAmount > 0) {
        this.logger.log(`Burning total ${totalBurnAmount} tokens from OPS`);

        const burnSignature = await this.burnTokens(sourceTokenAccount, totalBurnAmount);
        signatures.push(burnSignature);

        if (shouldBurn && totalDeflationaryBurn > 0) {
          await this.incrementPeriodBurn(totalDeflationaryBurn);
        }

        this.logger.log(`✅ Batched burn completed: ${burnSignature}`);
      }

      return signatures;

    } catch (error) {
      this.logger.error('Error in batched distribution execution:', error);
      throw error;
    }
  }

  /**
   * Mint tokens to college wallet
   */
  private async mintTokensToCollege(
    destinationWallet: string,
    amount: number
  ): Promise<string> {
    try {
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
          this.mintAuthorityKeypair.publicKey, // Payer (mint authority)
          destinationTokenAccount,
          destinationWalletPublicKey, // Owner
          this.mintPublicKey,
          TOKEN_2022_PROGRAM_ID
        );
        transaction.add(createATAInstruction);
      }

      // Add mint instruction
      const mintInstruction = createMintToInstruction(
        this.mintPublicKey,
        destinationTokenAccount,
        this.mintAuthorityKeypair.publicKey, // Mint authority
        amountBaseUnits,
        [],
        TOKEN_2022_PROGRAM_ID
      );

      transaction.add(mintInstruction);

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [this.mintAuthorityKeypair], // Mint authority as signer
        { commitment: 'confirmed' }
      );

      return signature;
    } catch (error) {
      throw new Error(`Failed to mint tokens: ${error.message}`);
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
      },
      select: ['amount'],
    });

    // Only college (2%) + burn (0.5%) = 2.5% of transaction amount
    const distributionPercentage = D1C_FEE_PERCENTAGE_FOR_COLLEGE + D1C_FEE_PERCENTAGE_TO_BURN;

    return harvestedNotDistributedTransactions.reduce((total, transaction) =>
      total + this.calculatePercentage(transaction.amount, distributionPercentage), 0
    );
  }

  /**
   * Get distribution summary for reporting
   */
  async getPendingDistributionSummary(): Promise<{
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
      },
      relations: ['linkedCollege'],
    });

    let totalTransactionAmount = 0;
    let linkedCollegeAmount = 0;
    let communityAmount = 0;

    for (const transaction of harvestedNotDistributedTransactions) {
      totalTransactionAmount += transaction.amount;

      const collegeAmount = this.calculatePercentage(transaction.amount, D1C_FEE_PERCENTAGE_FOR_COLLEGE);

      if (transaction.linkedCollege?.walletAddress) {
        linkedCollegeAmount += collegeAmount;
      } else {
        communityAmount += collegeAmount;
      }
    }

    const burnAmount = this.calculatePercentage(totalTransactionAmount, D1C_FEE_PERCENTAGE_TO_BURN);

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
        fee_distributed: false
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