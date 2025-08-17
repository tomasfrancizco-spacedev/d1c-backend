import { Controller, Post, Get, Logger, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FeeHarvesterService, HarvestResult } from './services/fee-harvester.service';
import { FeeDistributorService, DistributionResult } from './services/fee-distributor.service';
import { HarvestAndDistributeFeesDto } from './dto/harvest-and-distribute-fees.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@ApiTags('Fee Management')
@Controller('fee-management')
export class FeeManagementController {
  private readonly logger = new Logger(FeeManagementController.name);
 
  constructor(
    private readonly feeHarvesterService: FeeHarvesterService,
    private readonly feeDistributorService: FeeDistributorService,
  ) {}

  @Post('harvest-from-transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Harvest fees from unprocessed transactions directly to OPS wallet' })
  @ApiResponse({ status: 200, description: 'Fees harvested successfully' })
  async harvestFromTransactions(): Promise<HarvestResult> {
    this.logger.log(`Starting fee harvest from transactions to OPS wallet`);
    return await this.feeHarvesterService.harvestFeesFromTransactions();
  }

  @Post('harvest-from-accounts')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Harvest fees from all token accounts with withheld tokens directly to OPS wallet' })
  @ApiResponse({ status: 200, description: 'Fees harvested successfully' })
  async harvestFromAccounts(): Promise<HarvestResult> {
    this.logger.log(`Starting fee harvest from all accounts to OPS wallet`);
    return await this.feeHarvesterService.harvestFeesFromAllAccounts();
  }

  @Post('withdraw-from-mint')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Withdraw harvested fees from mint account to OPS wallet' })
  @ApiResponse({ status: 200, description: 'Fees withdrawn successfully' })
  async withdrawFromMint(): Promise<{ signature: string }> {
    this.logger.log(`Withdrawing fees from mint to OPS wallet`);
    const signature = await this.feeHarvesterService.withdrawFeesFromMint();
    return { signature };
  }

  @Post('distribute-fees')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Distribute fees from OPS wallet to college/community wallets and burn' })
  @ApiResponse({ status: 200, description: 'Fees distributed successfully' })
  async distributeFees(): Promise<DistributionResult> {
    this.logger.log(`Distributing fees from OPS wallet`);
    return await this.feeDistributorService.distributeFees();
  }

  @Get('distribution-summary')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get summary of fee distribution' })
  @ApiResponse({ status: 200, description: 'Distribution summary retrieved successfully' })
  async getDistributionSummary() {
    return await this.feeDistributorService.getDistributionSummary();
  }

  @Get('total-fees')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get total fees available for distribution' })
  @ApiResponse({ status: 200, description: 'Total fees retrieved successfully' })
  async getTotalFees(): Promise<{ totalFees: number }> {
    const totalFees = await this.feeDistributorService.getTotalFeesForDistribution();
    return { totalFees };
  }

  @Post('harvest-and-distribute-fees')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete fee processing cycle: harvest to OPS wallet -> distribute to college/community and burn' })
  @ApiResponse({ status: 200, description: 'Complete cycle processed successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid input',
    schema: {
      example: {
        success: false,
        message: 'Invalid input',
        code: 'INVALID_INPUT'
      }
    }
  })
  async harvestAndDistributeFees(@Body() body?: HarvestAndDistributeFeesDto): Promise<{
    harvestResult: HarvestResult;
    distributionResult: DistributionResult;
  }> {
    this.logger.log('Starting complete fee processing cycle');
    
    const useTransactionBased = body?.useTransactionBased ?? true;

    // Step 1: Harvest fees to OPS wallet
    const harvestResult = useTransactionBased
      ? await this.feeHarvesterService.harvestFeesFromTransactions()
      : await this.feeHarvesterService.harvestFeesFromAllAccounts();

    if (!harvestResult.success || harvestResult.totalFeesHarvested === 0) {
      this.logger.warn('No fees harvested, skipping distribution');
      return {
        harvestResult,
        distributionResult: {
          success: false,
          transactionsProcessed: 0,
          opsAmount: 0,
          collegeAmount: 0,
          burnedAmount: 0,
          errors: [],
          signatures: [],
        },
      };
    }

    // Step 2: Distribute fees from OPS wallet
    const distributionResult = await this.feeDistributorService.distributeFees();

    this.logger.log('Complete fee processing cycle finished');
    return {
      harvestResult,
      distributionResult,
    };
  }

  @Get('unharvested-transactions-count')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get count of transactions with unharvested fees' })
  @ApiResponse({ status: 200, description: 'Count retrieved successfully' })
  async getUnharvestedTransactionsCount(): Promise<{ count: number }> {
    const count = await this.feeHarvesterService.getUnharvestedTransactionsCount();
    return { count };
  }

  @Get('unharvested-transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions with unharvested fees' })
  @ApiResponse({ status: 200, description: 'Unharvested transactions retrieved successfully' })
  async getUnharvestedTransactions(@Body() body?: { limit?: number }) {
    const limit = body?.limit || 100;
    return await this.feeHarvesterService.getUnharvestedTransactions(limit);
  }

  @Get('undistributed-transactions-count')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get count of transactions ready for fee distribution' })
  @ApiResponse({ status: 200, description: 'Count retrieved successfully' })
  async getUndistributedTransactionsCount(): Promise<{ count: number }> {
    const count = await this.feeDistributorService.getTransactionsReadyForDistributionCount();
    return { count };
  }

  @Get('undistributed-transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transactions ready for fee distribution' })
  @ApiResponse({ status: 200, description: 'Undistributed transactions retrieved successfully' })
  async getUndistributedTransactions(@Body() body?: { limit?: number }) {
    const limit = body?.limit || 100;
    return await this.feeDistributorService.getTransactionsForDistribution(limit);
  }

  @Get('distribution-preview')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview fee distribution without executing' })
  @ApiResponse({ status: 200, description: 'Distribution preview retrieved successfully' })
  async getDistributionPreview() {
    return await this.feeDistributorService.previewDistribution();
  }

  @Post('mark-transactions-harvested')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually mark transactions as fee_harvested' })
  @ApiResponse({ status: 200, description: 'Transactions marked as fee_harvested' })
  async markTransactionsAsHarvested(@Body() body: { transactionIds: number[] }): Promise<{ success: boolean }> {
    await this.feeHarvesterService.markTransactionsAsHarvested(body.transactionIds);
    return { success: true };
  }

  @Post('mark-transactions-distributed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually mark transactions as fee_distributed' })
  @ApiResponse({ status: 200, description: 'Transactions marked as fee_distributed' })
  async markTransactionsAsDistributed(@Body() body: { transactionIds: number[] }): Promise<{ success: boolean }> {
    await this.feeDistributorService.markTransactionsAsDistributed(body.transactionIds);
    return { success: true };
  }
}
