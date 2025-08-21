import { Controller, Post, Get, Logger, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeeHarvesterService, HarvestResult } from './services/fee-harvester.service';
import { FeeDistributorService, DistributionResult } from './services/fee-distributor.service';
import { HarvestAndDistributeFeesDto } from './dto/harvest-and-distribute-fees.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { FeeSchedulerService } from './services/fee-scheduler-service';
import { FeeJobLog } from './entities/fee-job-log.entity';
import { PublicKey } from '@solana/web3.js';

@ApiTags('Fee Management')
@Controller('fee-management')
export class FeeManagementController {
  private readonly logger = new Logger(FeeManagementController.name);

  constructor(
    private readonly feeHarvesterService: FeeHarvesterService,
    private readonly feeDistributorService: FeeDistributorService,
    private readonly feeSchedulerService: FeeSchedulerService,
    @InjectRepository(FeeJobLog)
    private readonly feeJobLogRepository: Repository<FeeJobLog>,
  ) { }

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

  @Post('distribute-fees-from-transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Distribute fees from OPS wallet to college/community wallets and burn' })
  @ApiResponse({ status: 200, description: 'Fees distributed successfully' })
  async distributeFeesFromTransactions(): Promise<DistributionResult> {
    this.logger.log(`Distributing fees from transactions`);
    return await this.feeDistributorService.distributeFeesFromTransactions();
  }

  @Get('pending-distribution-summary')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get summary of pending fee distribution (harvested but not distributed)' })
  @ApiResponse({ status: 200, description: 'Distribution summary retrieved successfully', schema: {
    type: 'object',
    properties: {
      totalTransactionAmount: { type: 'number' },
      collegeAmount: { type: 'number' },
      burnAmount: { type: 'number' },
      communityAmount: { type: 'number' },
      linkedCollegeAmount: { type: 'number' },
    }
  } })
  async getPendingDistributionSummary() {
    return await this.feeDistributorService.getPendingDistributionSummary();
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
    const distributionResult = await this.feeDistributorService.distributeFeesFromTransactions();

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

  @Get('unharvested-accounts-summary')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get summary of unharvested accounts' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  async getUnharvestedAccountsSummary(): Promise<{ accounts: PublicKey[], count: number, amount: number }> {
    return await this.feeHarvesterService.getUnharvestedAccountsSummary();
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
  @ApiBody({
    description: 'Transaction IDs to mark as fee_harvested',
    schema: {
      type: 'object',
      properties: {
        transactionIds: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Array of transaction IDs to mark as fee_harvested',
          example: [1, 2, 3, 4, 5]
        }
      },
      required: ['transactionIds']
    }
  })
  @ApiResponse({ status: 200, description: 'Transactions marked as fee_harvested' })
  async markTransactionsAsHarvested(@Body() body: { transactionIds: number[] }): Promise<{ success: boolean }> {
    await this.feeHarvesterService.markTransactionsAsHarvested(body.transactionIds);
    return { success: true };
  }

  @Post('mark-transactions-distributed')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually mark transactions as fee_distributed' })
  @ApiBody({
    description: 'Transaction IDs to mark as fee_distributed',
    schema: {
      type: 'object',
      properties: {
        transactionIds: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'Array of transaction IDs to mark as fee_distributed',
          example: [1, 2, 3, 4, 5]
        }
      },
      required: ['transactionIds']
    }
  })
  @ApiResponse({ status: 200, description: 'Transactions marked as fee_distributed' })
  async markTransactionsAsDistributed(@Body() body: { transactionIds: number[] }): Promise<{ success: boolean }> {
    await this.feeDistributorService.markTransactionsAsDistributed(body.transactionIds);
    return { success: true };
  }

  @Post('trigger-automated-processing')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Manually trigger automated fee processing (for testing)' })
  @ApiResponse({ status: 200, description: 'Automated processing triggered successfully' })
  async triggerAutomatedProcessing(): Promise<{
    harvestResult: HarvestResult;
    distributionResult: DistributionResult;
  }> {
    this.logger.log('Manually triggering automated fee processing');
    return await this.feeSchedulerService.triggerManualProcessing();
  }

  @Get('job-logs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent fee job logs' })
  @ApiResponse({ status: 200, description: 'Job logs retrieved successfully' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return (default 50)' })
  async getJobLogs(@Query('limit') limit: number = 50): Promise<FeeJobLog[]> {
    return await this.feeJobLogRepository.find({
      order: { executedAt: 'DESC' },
      take: limit,
    });
  }

  @Get('job-logs/summary')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get simple job execution summary' })
  @ApiResponse({ status: 200, description: 'Job summary retrieved successfully' })
  async getJobSummary(): Promise<{
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    totalFeesHarvested: number;
    totalFeesDistributed: number;
    totalFeesBurned: number;
  }> {
    const [stats] = await this.feeJobLogRepository
      .createQueryBuilder('job')
      .select([
        'COUNT(*) as totalJobs',
        'COUNT(CASE WHEN job.success = true THEN 1 END) as successfulJobs',
        'COUNT(CASE WHEN job.success = false THEN 1 END) as failedJobs',
        'SUM(job.harvestedAmount) as totalFeesHarvested',
        'SUM(job.distributedAmount) as totalFeesDistributed',
        'SUM(job.burnedAmount) as totalFeesBurned',
      ])
      .getRawOne();

    return {
      totalJobs: parseInt(stats.totalJobs) || 0,
      successfulJobs: parseInt(stats.successfulJobs) || 0,
      failedJobs: parseInt(stats.failedJobs) || 0,
      totalFeesHarvested: parseFloat(stats.totalFeesHarvested) || 0,
      totalFeesDistributed: parseFloat(stats.totalFeesDistributed) || 0,
      totalFeesBurned: parseFloat(stats.totalFeesBurned) || 0,
    };
  }
}
