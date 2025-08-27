import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { HeliusWebhookDto } from './dto/helius-webhook.dto';
import { TransactionService } from '../transaction/transaction.service';
import { D1cWalletService } from '../d1c-wallet/d1c-wallet.service';
import { StatsService } from '../stats/stats.service';
import { D1C_FEE_PERCENTAGE, D1C_FEE_PERCENTAGE_FOR_COLLEGE } from '../utils/fees';
import { College } from '../college/entities/college.entity';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly d1cWalletService: D1cWalletService,
    private readonly statsService: StatsService,
  ) { }

  async processTransaction(transaction: HeliusWebhookDto): Promise<void> {
    try {
      this.logger.log(`Processing transaction: ${transaction.signature}`);

      const fromAddress = this.extractFromAddress(transaction);

      if (fromAddress) {
        const user = await this.findUserByWallet(fromAddress);

        if (user) {
          await this.handleUserTransaction(user, transaction);
        } else {
          await this.handleNonUserTransaction(fromAddress, transaction);
        }
      }
    } catch (error) {
      this.logger.error(`Error processing transaction ${transaction.signature}:`, error);
    }
  }

  private async findUserByWallet(walletAddress: string): Promise<any | null> {
    const user = await this.userService.findUserByWalletAddress(walletAddress);
    return user;
  }

  private async handleUserTransaction(user: any, transaction: HeliusWebhookDto): Promise<void> {
    this.logger.log(`Transaction involves user ${user.walletAddress}: ${transaction.signature}`);

    console.log(`User ${user.walletAddress} had transaction: ${transaction.signature}`);

    // Create TRANSACTIONS table record
    await this.createTransactionRecord(user, transaction);
  }

  private async handleNonUserTransaction(walletAddress: string, transaction: HeliusWebhookDto): Promise<void> {
    this.logger.log(`Transaction involves non-user wallet: ${walletAddress}`);

    // Create TRANSACTIONS table record without user data
    // Use community wallet from D1C_WALLETS table
    await this.createTransactionRecord(null, transaction);
  }

  private async createTransactionRecord(user: any | null, transaction: HeliusWebhookDto): Promise<void> {
    // Extract transaction data
    const fromAddress = this.extractFromAddress(transaction);
    const toAddress = this.extractToAddress(transaction);
    const amount = this.extractAmount(transaction);
    const d1cFee = amount * D1C_FEE_PERCENTAGE; // 3.5%

    let linkedCollege: College | null = null;

    if (user && user.currentLinkedCollege) { 
      // User exists and has linked school
      linkedCollege = user.currentLinkedCollege;
    } else {
      linkedCollege = null;
    }

    // Save to TRANSACTIONS table
    try {
      const transactionRecord = await this.transactionService.create({
        from: fromAddress,
        to: toAddress,
        timestamp: new Date(parseInt(transaction.timestamp) * 1000),
        amount: amount,
        d1cFee: d1cFee,
        linkedCollegeId: linkedCollege?.id || null,
        signature: transaction.signature
      });

      this.logger.log(`Transaction record created with ID: ${transactionRecord.id}`);

      await this.updateStatsAfterTransaction(
        user?.id || null,
        amount,
        new Date(parseInt(transaction.timestamp) * 1000),
        fromAddress,
        linkedCollege || null
      );


    } catch (error) {
      this.logger.error(`Error saving transaction ${transaction.signature}:`, error);
    }
  }

  private async getCommunityWallet(): Promise<string | null> {
    try {
      return await this.d1cWalletService.getCommunityWallet();
    } catch (error) {
      this.logger.error('Error getting community wallet:', error);
      return null;
    }
  }

  private extractFromAddress(transaction: HeliusWebhookDto): string | null {
    if (transaction.tokenTransfers?.length > 0) {
      return transaction.tokenTransfers[0].fromUserAccount || null;
    }
    return null;
  }

  private extractToAddress(transaction: HeliusWebhookDto): string | null {
    if (transaction.tokenTransfers?.length > 0) {
      return transaction.tokenTransfers[0].toUserAccount || null;
    }
    return null;
  }

  private extractAmount(transaction: HeliusWebhookDto): number {
    if (transaction.tokenTransfers?.length > 0) {
      return transaction.tokenTransfers[0].tokenAmount || 0;
    }
    return 0;
  }

  // In src/webhooks/webhooks.service.ts - updateStatsAfterTransaction method
  private async updateStatsAfterTransaction(
    userId: number | null,
    amount: number,
    transactionDate: Date,
    fromAddress: string | null,
    linkedCollege: College | null
  ): Promise<void> {

    const collegeFeeAmount = amount * D1C_FEE_PERCENTAGE_FOR_COLLEGE;
    try {
      // Always update user stats for the wallet address (even if no user account exists)
      if (fromAddress) {
        await this.statsService.updateUserStats(
          userId,
          fromAddress,
          collegeFeeAmount,
          transactionDate,
          linkedCollege
        );
      }

      // Update college stats if linked school wallet exists
      if (linkedCollege) {
        await this.statsService.updateCollegeStats(
          linkedCollege.walletAddress,
          collegeFeeAmount,
          transactionDate
        );
      }

      // Update trading volume stats
      await this.statsService.updateTradingVolumeStats(
        amount,
        transactionDate,
        fromAddress || undefined,
        linkedCollege?.walletAddress || undefined
      );

      this.logger.log(`Successfully updated all stats for transaction amount: ${amount}`);
    } catch (error) {
      this.logger.error('Error updating stats after transaction:', error);
    }
  }
}