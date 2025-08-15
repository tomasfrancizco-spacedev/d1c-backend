import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FeeHarvesterService } from './services/fee-harvester.service';
import { FeeDistributorService } from './services/fee-distributor.service';
import { FeeManagementController } from './fee-management.controller';
import { Transaction } from '../transaction/entities/transaction.entity';
import { BurnTracker } from './entities/burn-tracker.entity';
import { D1cWalletModule } from '../d1c-wallet/d1c-wallet.module';
import { TransactionModule } from '../transaction/transaction.module';
import { CollegeModule } from '../college/college.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, BurnTracker]),
    ConfigModule,
    D1cWalletModule,
    TransactionModule,
    CollegeModule,
  ],
  providers: [FeeHarvesterService, FeeDistributorService],
  controllers: [FeeManagementController],
  exports: [FeeHarvesterService, FeeDistributorService],
})
export class FeeManagementModule {}
