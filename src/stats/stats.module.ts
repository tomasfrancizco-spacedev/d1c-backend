import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { UserStats } from './entities/user-stats.entity';
import { CollegeStats } from './entities/college-stats.entity';
import { TradingVolumeStats } from './entities/trading-volume-stats.entity';
import { CollegeModule } from '../college/college.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserStats, CollegeStats, TradingVolumeStats]),
    CollegeModule,
  ],
  providers: [StatsService],
  exports: [StatsService],
  controllers: [StatsController],
})
export class StatsModule {}