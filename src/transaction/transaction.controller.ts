import { Controller, Get, Logger, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionService: TransactionService) { }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiResponse({ status: 200, description: 'Transactions fetched successfully' })
  async getTransactions(@Query('limit') limit?: number, @Query('offset') offset?: number) {
    try {
      const transactions = await this.transactionService.findAll(limit || 10, offset || 0);

      return { success: true, transactions };
    } catch (error) {
      this.logger.error('Error fetching transactions:', error);
      throw error;
    }
  }

  @Get('user/:userWalletAddress')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions by user id' })
  @ApiResponse({ status: 200, description: 'Transaction fetched successfully' })
  async getTransactionByUserWalletAddress(@Param('userWalletAddress') userWalletAddress: string, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    try {
      const transactions = await this.transactionService.getTransactionsByUserWalletAddress(userWalletAddress, limit || 10, offset || 0);
      return { success: true, transactions };
    } catch (error) {
      this.logger.error('Error fetching transaction:', error);
      throw error;
    }
  }
}