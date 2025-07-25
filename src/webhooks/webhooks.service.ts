import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../utils/user/user.service';
import { HeliusWebhookDto } from './dto/helius-webhook.dto';
import { TransactionService } from '../transaction/transaction.service';
import { D1cWalletService } from '../d1c-wallet/d1c-wallet.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
    private readonly d1cWalletService: D1cWalletService,
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
    this.logger.log(`Transaction involves user ${user.email}: ${transaction.signature}`);

    console.log(`User ${user.email} had transaction: ${transaction.signature}`);

    // Create TRANSACTIONS table record
    await this.createTransactionRecord(user, transaction);
  }

  private async handleNonUserTransaction(walletAddress: string, transaction: HeliusWebhookDto): Promise<void> {
    this.logger.log(`Transaction involves non-user wallet: ${walletAddress}`);

    // Create TRANSACTIONS table record without user data
    // Use community wallet from D1C_WALLETS table
    await this.createTransactionRecord(null, transaction, walletAddress);
  }

  private async createTransactionRecord(user: any | null, transaction: HeliusWebhookDto, walletAddress?: string): Promise<void> {
    // Extract transaction data
    const fromAddress = this.extractFromAddress(transaction);
    const toAddress = this.extractToAddress(transaction);
    const amount = this.extractAmount(transaction);
    const d1cFee = amount * 0.035; // 3.5%

    let linkedSchoolWallet: string | null = null;

    if (user && user.currentLinkedCollege) {
      // User exists and has linked school
      linkedSchoolWallet = user.currentLinkedCollege;
    } else {
      // User doesn't exist or no linked school - use community wallet
      linkedSchoolWallet = await this.getCommunityWallet();
    }

    console.log('Transaction data to save:', {
      from: fromAddress,
      to: toAddress,
      timestamp: transaction.timestamp,
      amount: amount,
      d1cFee: d1cFee,
      linkedSchoolWallet: linkedSchoolWallet,
      signature: transaction.signature
    });

    // Save to TRANSACTIONS table
    try {
      const transactionRecord = await this.transactionService.create({
        from: fromAddress,
        to: toAddress,
        timestamp: new Date(parseInt(transaction.timestamp) * 1000),
        amount: amount,
        d1cFee: d1cFee,
        linkedSchoolWallet: linkedSchoolWallet,
        signature: transaction.signature
      });

      this.logger.log(`Transaction record created with ID: ${transactionRecord.id}`);
    } catch (error) {
      this.logger.error(`Error saving transaction ${transaction.signature}:`, error);
      // Don't throw - we want to continue processing other transactions
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
    // Extract from address from token transfers only
    if (transaction.tokenTransfers?.length > 0) {
      return transaction.tokenTransfers[0].fromUserAccount || null;
    }
    return null;
  }

  private extractToAddress(transaction: HeliusWebhookDto): string | null {
    // Extract to address from token transfers only
    if (transaction.tokenTransfers?.length > 0) {
      return transaction.tokenTransfers[0].toUserAccount || null;
    }
    return null;
  }

  private extractAmount(transaction: HeliusWebhookDto): number {
    // Extract amount from token transfers only
    if (transaction.tokenTransfers?.length > 0) {
      return transaction.tokenTransfers[0].tokenAmount || 0;
    }
    return 0;
  }
}