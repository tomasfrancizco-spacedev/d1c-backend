import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { FeeHarvesterService } from './services/fee-harvester.service';
import { FeeDistributorService } from './services/fee-distributor.service';
import { FeeSchedulerService } from './services/fee-scheduler-service';
import { FeeManagementController } from './fee-management.controller';
import { Transaction } from '../transaction/entities/transaction.entity';
import { BurnTracker } from './entities/burn-tracker.entity';
import { FeeJobLog } from './entities/fee-job-log.entity';
import { D1cWalletModule } from '../d1c-wallet/d1c-wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { CollegeModule } from '../college/college.module';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Transaction, BurnTracker, FeeJobLog]),
    ConfigModule,
    D1cWalletModule,
    TransactionModule,
    CollegeModule,
    AuthModule,
    forwardRef(() => UserModule),
  ],
  providers: [FeeHarvesterService, FeeDistributorService, FeeSchedulerService],
  controllers: [FeeManagementController],
  exports: [FeeHarvesterService, FeeDistributorService, FeeSchedulerService],
})
export class FeeManagementModule {}
