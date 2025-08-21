import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getTransferFeeAmount,
  unpackAccount,
  withdrawWithheldTokensFromAccounts,
  withdrawWithheldTokensFromMint,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotent,
} from '@solana/spl-token';
import { Transaction } from '../../transaction/entities/transaction.entity';
import { D1cWalletService } from '../../d1c-wallet/d1c-wallet.service';

export interface HarvestResult {
  success: boolean;
  transactionsProcessed: number;
  totalFeesHarvested: number;
  errors: string[];
}

@Injectable()
export class FeeHarvesterService {
  private readonly logger = new Logger(FeeHarvesterService.name);
  private readonly connection: Connection;
  private readonly mintPublicKey: PublicKey;
  private readonly opsWalletKeypair: Keypair;
  private readonly withdrawAuthorityKeypair: Keypair;
  private readonly opsWalletAddress: string;

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
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

    const withdrawAuthoritySecret = this.configService.get<string>('WITHDRAW_AUTHORITY_SECRET_KEY');
    if (!withdrawAuthoritySecret) {
      throw new Error('WITHDRAW_AUTHORITY_SECRET_KEY not configured');
    }
    this.withdrawAuthorityKeypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(withdrawAuthoritySecret))
    );
  }

  /**
   * Harvest fees using the transaction-based approach
   * This method processes unprocessed transactions and withdraws fees directly to OPS wallet
   */

  // dedupePks = (arr: PublicKey[]) => [...new Map(arr.map(pk => [pk.toBase58(), pk])).values()];
  dedupePks = (arr: { srcAta: PublicKey, txId: number, recipientOwner?: PublicKey }[]) => [...new Map(arr.map(pk => [pk.srcAta.toBase58(), pk])).values()];

  async harvestFeesFromTransactions(): Promise<HarvestResult> {
    const result: HarvestResult = {
      success: true,
      transactionsProcessed: 0,
      totalFeesHarvested: 0,
      errors: [],
    };

    try {
      // Get all transactions that haven't had fees harvested yet
      const unharvestedTransactions = await this.transactionRepository.find({
        where: {
          fee_harvested: false,
        },
        relations: ['linkedCollege'],
        order: { timestamp: 'ASC' },
      });

      this.logger.log(`Found ${unharvestedTransactions.length} transactions with unharvested fees`);

      if (unharvestedTransactions.length === 0) {
        result.success = false;
        result.errors.push('No transactions with unharvested fees found');
        return result;
      }

      const sources: { srcAta: PublicKey; txId: number }[] = [];

      for (const transaction of unharvestedTransactions) {
        if (transaction.to) {
          try {
            const recipientPublicKey = new PublicKey(transaction.to);
            const recipientTokenAccount = await getAssociatedTokenAddress(
              this.mintPublicKey,
              recipientPublicKey,
              false,
              TOKEN_2022_PROGRAM_ID
            );

            const accountInfo = await this.connection.getAccountInfo(recipientTokenAccount, 'confirmed');

            if (accountInfo) {
              const account = unpackAccount(
                recipientTokenAccount,
                accountInfo,
                TOKEN_2022_PROGRAM_ID,
              );

              const transferFeeAmount = getTransferFeeAmount(account);

              if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > 0) {
                this.logger.log(`Processing a fee harvest for tx ${transaction.id} to ${transaction.to}`)
                sources.push({ srcAta: recipientTokenAccount, txId: transaction.id });
                result.totalFeesHarvested += Number(transferFeeAmount.withheldAmount);
              }

            }
          } catch (error) {
            this.logger.warn(`Failed to process transaction ${transaction.id} for recipient ${transaction.to}: ${error.message}`);
          }
        }
      }

      if (sources.length > 0) {
        const opsTokenAccount = await createAssociatedTokenAccountIdempotent( // check if this is necessary
          this.connection,
          this.withdrawAuthorityKeypair,               // payer
          this.mintPublicKey,
          this.opsWalletKeypair.publicKey,
          { commitment: 'confirmed' },                // optional
          TOKEN_2022_PROGRAM_ID
        );

        const uniqueSources = this.dedupePks(sources.map(x => {
          return {
            srcAta: x.srcAta,
            txId: x.txId
          }
        }));

        const sig = await withdrawWithheldTokensFromAccounts(
          this.connection,
          this.withdrawAuthorityKeypair,       // payer
          this.mintPublicKey,
          opsTokenAccount,                     // DESTINATION (must be Token-2022 ATA for this mint)
          this.withdrawAuthorityKeypair,       // withdraw authority (must match mint config)
          [],
          uniqueSources.map(x => x.srcAta),
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        this.logger.log(`Withdrew fees from ${uniqueSources.length} accounts to OPS. Transaction: ${sig}`);

        // mark only those txs whose src we actually processed
        const processedIds = new Set(uniqueSources.map(pk => pk.srcAta.toBase58()));
        const okIds = sources.filter(x => processedIds.has(x.srcAta.toBase58())).map(x => x.txId);
        if (okIds.length) {
          await this.transactionRepository.update(okIds, { fee_harvested: true });
          result.transactionsProcessed += okIds.length;
        }
      }

      return result;

    } catch (error) {
      this.logger.error('Error in harvestFeesFromTransactions:', error);
      result.success = false;
      result.errors.push(error.message);
      return result;
    }
  }

  /**
   * Backup method: Harvest fees by scanning all token accounts
   * This method fetches all token accounts for the mint and withdraws fees directly to OPS wallet
   */
  async harvestFeesFromAllAccounts(): Promise<HarvestResult> {
    const result: HarvestResult = {
      success: true,
      transactionsProcessed: 0,
      totalFeesHarvested: 0,
      errors: [],
    };

    try {
      // Retrieve all Token Accounts for the Mint Account
      const allAccounts = await this.connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
        commitment: 'confirmed',
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: this.mintPublicKey.toString(),
            },
          },
        ],
      });

      // List of Token Accounts to withdraw fees from
      const accountsToWithdrawFrom: PublicKey[] = [];
      let totalWithheldAmount = 0;

      for (const accountInfo of allAccounts) {
        try {
          const account = unpackAccount(
            accountInfo.pubkey,
            accountInfo.account,
            TOKEN_2022_PROGRAM_ID,
          );

          // Extract transfer fee data from each account
          const transferFeeAmount = getTransferFeeAmount(account);

          // Check if fees are available to be withdrawn
          if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > 0) {
            accountsToWithdrawFrom.push(accountInfo.pubkey);
            totalWithheldAmount += Number(transferFeeAmount.withheldAmount);
          }
        } catch (error) {
          this.logger.warn(`Failed to process account ${accountInfo.pubkey.toString()}: ${error.message}`);
        }
      }

      this.logger.log(`Found ${accountsToWithdrawFrom.length} accounts with withheld tokens. Total withheld: ${totalWithheldAmount}`);

      if (accountsToWithdrawFrom.length > 0) {
        const opsTokenAccount = await createAssociatedTokenAccountIdempotent( // check if this is necessary
          this.connection,
          this.withdrawAuthorityKeypair,               // payer
          this.mintPublicKey,
          this.opsWalletKeypair.publicKey,
          { commitment: 'confirmed' },                // optional
          TOKEN_2022_PROGRAM_ID
        );
        // Withdraw withheld tokens directly from accounts to OPS wallet
        try {
          const signature = await withdrawWithheldTokensFromAccounts(
            this.connection,
            this.withdrawAuthorityKeypair,       // payer
            this.mintPublicKey,
            opsTokenAccount, // Destination account for fee withdrawal (OPS wallet)
            this.withdrawAuthorityKeypair, // Authority for fee withdrawal (OPS wallet)
            [], // Additional signers
            accountsToWithdrawFrom, // Token Accounts to withdraw from
            undefined, // Confirmation options
            TOKEN_2022_PROGRAM_ID,
          );

          this.logger.log(`Withdrew fees from ${accountsToWithdrawFrom.length} accounts. Transaction: ${signature}`);
          result.totalFeesHarvested = totalWithheldAmount;

          // Find and mark transactions as harvested for accounts we processed
          try {
            // Convert PublicKeys to base58 strings for database comparison
            const harvestedAccountAddresses = accountsToWithdrawFrom.map(pk => pk.toString());

            this.logger.log(`Looking for transactions with 'to' addresses in: ${harvestedAccountAddresses.slice(0, 5).join(', ')}${harvestedAccountAddresses.length > 5 ? '...' : ''}`);

            // Find transaction IDs that match the harvested account addresses and are not yet marked as harvested
            const transactionIdsToUpdate = await this.transactionRepository
              .createQueryBuilder('transaction')
              .select('transaction.id')
              .where('transaction.fee_harvested = :harvested', { harvested: false })
              .andWhere('transaction.to IN (:...addresses)', { addresses: harvestedAccountAddresses })
              .getMany();

            if (transactionIdsToUpdate.length > 0) {
              const idsToUpdate = transactionIdsToUpdate.map(tx => tx.id);
              await this.transactionRepository.update(idsToUpdate, { fee_harvested: true });

              this.logger.log(`Marked ${idsToUpdate.length} transactions as fee_harvested after account-based harvest`);
              result.transactionsProcessed = idsToUpdate.length;
            } else {
              this.logger.log('No matching transactions found to mark as harvested');
              result.transactionsProcessed = 0;
            }

          } catch (dbError) {
            const errorMsg = `Failed to update transaction records: ${dbError.message}`;
            this.logger.warn(errorMsg);
            result.errors.push(errorMsg);
            // Don't fail the entire operation since the fee withdrawal was successful
            result.transactionsProcessed = 0;
          }
        } catch (error) {
          const errorMsg = `Failed to withdraw fees from accounts: ${error.message}`;
          this.logger.error(errorMsg);
          result.errors.push(errorMsg);
          result.success = false;
        }
      } else {
        this.logger.log('No accounts with withheld tokens found');
        result.success = false;
        result.errors.push('No accounts with withheld tokens found');
      }

    } catch (error) {
      this.logger.error('Error in harvestFeesFromAllAccounts:', error);
      result.success = false;
      result.errors.push(error.message);
    }

    return result;
  }

  /**
   * Get unharvested transactions count for monitoring (excluding OPS wallet transactions)
   */
  async getUnharvestedTransactionsCount(): Promise<number> {
    return await this.transactionRepository.count({
      where: {
        fee_harvested: false,
      },
    });
  }

  /**
   * Get unharvested transactions with details (excluding OPS wallet transactions)
   */
  async getUnharvestedTransactions(limit: number = 100): Promise<Transaction[]> {
    return await this.transactionRepository.find({
      where: {
        fee_harvested: false,
      },
      relations: ['linkedCollege'],
      order: { timestamp: 'ASC' },
      take: limit,
    });
  }

  /**
   * Manually mark transactions as fee_harvested (for testing or manual intervention)
   */
  async markTransactionsAsHarvested(transactionIds: number[]): Promise<void> {
    await this.transactionRepository.update(
      transactionIds,
      { fee_harvested: true }
    );

    this.logger.log(`Manually marked ${transactionIds.length} transactions as fee_harvested`);
  }

  async getUnharvestedAccountsSummary(): Promise<{ accounts: PublicKey[], count: number, amount: number }> {

    try {
      const allAccounts = await this.connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
        commitment: 'confirmed',
        filters: [
          {
            memcmp: {
              offset: 0,
              bytes: this.mintPublicKey.toString(),
            },
          },
        ],
      });

      // List of Token Accounts to withdraw fees from
      const accountsToWithdrawFrom: PublicKey[] = [];
      let totalWithheldAmount = 0;

      for (const accountInfo of allAccounts) {
        try {
          const account = unpackAccount(
            accountInfo.pubkey,
            accountInfo.account,
            TOKEN_2022_PROGRAM_ID,
          );

          // Extract transfer fee data from each account
          const transferFeeAmount = getTransferFeeAmount(account);

          // Check if fees are available to be withdrawn
          if (transferFeeAmount !== null && transferFeeAmount.withheldAmount > 0) {
            accountsToWithdrawFrom.push(accountInfo.pubkey);
            totalWithheldAmount += Number(transferFeeAmount.withheldAmount);
          }
        } catch (error) {
          this.logger.warn(`Failed to process account ${accountInfo.pubkey.toString()}: ${error.message}`);
        }
      }

      this.logger.log(`Found ${accountsToWithdrawFrom.length} accounts with withheld tokens. Total withheld: ${totalWithheldAmount}`);
      return { accounts: accountsToWithdrawFrom, count: accountsToWithdrawFrom.length, amount: totalWithheldAmount };
    } catch (error) {
      this.logger.error('Error in getUnharvestedAccountsSummary:', error);
      throw error;
    }
  }
}