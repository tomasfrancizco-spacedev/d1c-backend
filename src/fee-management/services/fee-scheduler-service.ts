import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeeHarvesterService } from './fee-harvester.service';
import { FeeDistributorService } from './fee-distributor.service';
import { ConfigService } from '@nestjs/config';
import { FeeJobLog } from '../entities/fee-job-log.entity';

@Injectable()
export class FeeSchedulerService {
  private readonly logger = new Logger(FeeSchedulerService.name);
  private isProcessing = false;

  constructor(
    private readonly feeHarvesterService: FeeHarvesterService,
    private readonly feeDistributorService: FeeDistributorService,
    private readonly configService: ConfigService,
    @InjectRepository(FeeJobLog)
    private readonly feeJobLogRepository: Repository<FeeJobLog>,
  ) {}

  /**
   * Automatic fee harvesting and distribution
   * Runs every 30 minutes by default
   * Can be configured via CRON_FEE_PROCESSING environment variable
   */
  @Cron(process.env.CRON_FEE_PROCESSING || '0 */30 * * * *', {
    name: 'fee-processing',
    timeZone: 'UTC',
  })
  async automaticFeeProcessing(): Promise<void> {
    // Prevent overlapping executions
    if (this.isProcessing) {
      this.logger.warn('Fee processing already in progress, skipping this run');
      return;
    }

    // Check if automated processing is enabled
    const isEnabled = this.configService.get<boolean>('ENABLE_AUTOMATED_FEE_PROCESSING', true);
    if (!isEnabled) {
      this.logger.debug('Automated fee processing is disabled');
      return;
    }

    this.isProcessing = true;

    try {
      this.logger.log('🚀 Starting automated fee processing cycle...');

      // Step 1: Harvest fees to OPS wallet
      const harvestResult = await this.feeHarvesterService.harvestFeesFromTransactions();

      if (!harvestResult.success) {
        this.logger.error('❌ Fee harvesting failed:', harvestResult.errors);
        await this.logJobExecution(false, 0, 0, 0, harvestResult.errors.join('; '));
        return;
      }

      if (harvestResult.totalFeesHarvested === 0) {
        this.logger.log('ℹ️  No fees to harvest, skipping distribution');
        await this.logJobExecution(true, 0, 0, 0, null);
        return;
      }

      this.logger.log(`✅ Harvested ${harvestResult.totalFeesHarvested} tokens from ${harvestResult.transactionsProcessed} transactions`);

      // Step 2: Distribute fees from OPS wallet
      const distributionResult = await this.feeDistributorService.distributeFeesFromTransactions();

      if (!distributionResult.success) {
        this.logger.error('❌ Fee distribution failed:', distributionResult.errors);
        await this.logJobExecution(false, harvestResult.totalFeesHarvested, 0, 0, `Distribution failed: ${distributionResult.errors.join('; ')}`);
        return;
      }

      // Log successful execution
      await this.logJobExecution(
        true,
        harvestResult.totalFeesHarvested,
        distributionResult.collegeAmount,
        distributionResult.burnedAmount,
        null
      );

      this.logger.log(`🎉 Automated fee processing completed successfully`);
      this.logger.log(`📊 Summary:
        - Harvested: ${harvestResult.totalFeesHarvested} tokens
        - Distributed to colleges: ${distributionResult.collegeAmount} tokens
        - Burned (deflationary): ${distributionResult.burnedAmount} tokens`);

    } catch (error) {
      this.logger.error('💥 Automated fee processing failed with error:', error);
      await this.logJobExecution(false, 0, 0, 0, error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual trigger for testing (can be called via another endpoint)
   */
  async triggerManualProcessing(): Promise<{
    harvestResult: any;
    distributionResult: any;
  }> {
    this.logger.log('🔧 Manual fee processing triggered');
    
    try {
      const harvestResult = await this.feeHarvesterService.harvestFeesFromTransactions();
      
      if (!harvestResult.success || harvestResult.totalFeesHarvested === 0) {
        await this.logJobExecution(
          harvestResult.success,
          harvestResult.totalFeesHarvested,
          0,
          0,
          harvestResult.success ? null : harvestResult.errors.join('; ')
        );
        
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

      const distributionResult = await this.feeDistributorService.distributeFeesFromTransactions();
      
      await this.logJobExecution(
        distributionResult.success,
        harvestResult.totalFeesHarvested,
        distributionResult.collegeAmount,
        distributionResult.burnedAmount,
        distributionResult.success ? null : distributionResult.errors.join('; ')
      );
      
      return {
        harvestResult,
        distributionResult,
      };
    } catch (error) {
      await this.logJobExecution(false, 0, 0, 0, error.message);
      throw error;
    }
  }

  /**
   * Health check - runs every 5 minutes to log status
   */
  @Cron(CronExpression.EVERY_5_MINUTES, {
    name: 'fee-health-check',
    timeZone: 'UTC',
  })
  async healthCheck(): Promise<void> {
    try {
      const unharvestedCount = await this.feeHarvesterService.getUnharvestedTransactionsCount();
      const undistributedCount = await this.feeDistributorService.getTransactionsReadyForDistributionCount();
      
      if (unharvestedCount > 0 || undistributedCount > 0) {
        this.logger.log(`📋 Fee Processing Status: ${unharvestedCount} unharvested, ${undistributedCount} undistributed transactions`);
      }
    } catch (error) {
      this.logger.error('Health check failed:', error);
    }
  }

  /**
   * Simple method to log job execution
   */
  private async logJobExecution(
    success: boolean,
    harvestedAmount: number,
    distributedAmount: number,
    burnedAmount: number,
    errorMessage: string | null
  ): Promise<void> {
    try {
      const jobLog = this.feeJobLogRepository.create({
        executedAt: new Date(),
        success,
        harvestedAmount,
        distributedAmount,
        burnedAmount,
        errorMessage,
      });
      await this.feeJobLogRepository.save(jobLog);
    } catch (error) {
      this.logger.error('Failed to log job execution:', error);
    }
  }
}