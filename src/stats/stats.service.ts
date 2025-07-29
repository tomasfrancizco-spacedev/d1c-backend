import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UserStats } from './entities/user-stats.entity';
import { CollegeStats } from './entities/college-stats.entity';
import { TradingVolumeStats, PeriodType } from './entities/trading-volume-stats.entity';
import { CollegeService } from '../college/college.service';

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    @InjectRepository(UserStats)
    private userStatsRepository: Repository<UserStats>,
    @InjectRepository(CollegeStats)
    private collegeStatsRepository: Repository<CollegeStats>,
    @InjectRepository(TradingVolumeStats)
    private tradingVolumeStatsRepository: Repository<TradingVolumeStats>,
    private collegeService: CollegeService,
  ) { }

  async updateUserStats(userId: number | null, walletAddress: string, amount: number, transactionDate: Date): Promise<void> {
    try {
      await this.userStatsRepository.query(`
        INSERT INTO user_stats ("userId", "walletAddress", "totalContributions", "transactionCount", "lastContributionDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 1, $4, now(), now())
        ON CONFLICT ("walletAddress") 
        DO UPDATE SET
          "totalContributions" = user_stats."totalContributions" + EXCLUDED."totalContributions",
          "transactionCount" = user_stats."transactionCount" + 1,
          "lastContributionDate" = GREATEST(user_stats."lastContributionDate", EXCLUDED."lastContributionDate"),
          "updatedAt" = now()
      `, [userId, walletAddress, amount, transactionDate]);
  
      this.logger.log(`Updated user stats for wallet ${walletAddress}: +${amount}`);
    } catch (error) {
      this.logger.error(`Error updating user stats for wallet ${walletAddress}:`, error);
    }
  }

  async updateCollegeStats(walletAddress: string, amount: number, transactionDate: Date): Promise<void> {
    try {
      const college = await this.collegeService.findByWalletAddress(walletAddress);
      if (!college) {
        this.logger.warn(`College not found for wallet address: ${walletAddress}`);
        return;
      }

      await this.collegeStatsRepository.query(`
        INSERT INTO college_stats ("collegeId", "walletAddress", "totalContributionsReceived", "transactionCount", "lastContributionDate", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, 1, $4, now(), now())
        ON CONFLICT ("collegeId") 
        DO UPDATE SET
          "totalContributionsReceived" = college_stats."totalContributionsReceived" + EXCLUDED."totalContributionsReceived",
          "transactionCount" = college_stats."transactionCount" + 1,
          "lastContributionDate" = GREATEST(college_stats."lastContributionDate", EXCLUDED."lastContributionDate"),
          "updatedAt" = now()
      `, [college.id, walletAddress, amount, transactionDate]);

      this.logger.log(`Updated college stats for college ${college.name}: +${amount}`);
    } catch (error) {
      this.logger.error(`Error updating college stats for wallet ${walletAddress}:`, error);
    }
  }

  async updateTradingVolumeStats(amount: number, transactionDate: Date, userWallet?: string, collegeWallet?: string): Promise<void> {
    try {
      const periods = this.generatePeriods(transactionDate);

      for (const period of periods) {
        await this.tradingVolumeStatsRepository.query(`
          INSERT INTO trading_volume_stats ("periodType", "periodStart", "periodEnd", "totalVolume", "transactionCount", "uniqueUsers", "uniqueColleges", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, 1, $5, $6, now(), now())
          ON CONFLICT ("periodType", "periodStart")
          DO UPDATE SET
            "totalVolume" = trading_volume_stats."totalVolume" + EXCLUDED."totalVolume",
            "transactionCount" = trading_volume_stats."transactionCount" + 1,
            "updatedAt" = now()
        `, [period.type, period.start, period.end, amount, userWallet ? 1 : 0, collegeWallet ? 1 : 0]);
      }

      this.logger.log(`Updated trading volume stats: +${amount}`);
    } catch (error) {
      this.logger.error('Error updating trading volume stats:', error);
    }
  }

  private generatePeriods(date: Date): Array<{ type: PeriodType; start: Date; end?: Date }> {
    const periods: { type: PeriodType; start: Date; end?: Date }[] = [];

    // Daily
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
    periods.push({ type: PeriodType.DAILY, start: dayStart, end: dayEnd });

    // Weekly
    const weekStart = new Date(dayStart);
    weekStart.setDate(dayStart.getDate() - dayStart.getDay()); // Start of week (Sunday)
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
    periods.push({ type: PeriodType.WEEKLY, start: weekStart, end: weekEnd });

    // Monthly
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
    periods.push({ type: PeriodType.MONTHLY, start: monthStart, end: monthEnd });

    // Yearly
    const yearStart = new Date(date.getFullYear(), 0, 1);
    const yearEnd = new Date(date.getFullYear(), 11, 31, 23, 59, 59, 999);
    periods.push({ type: PeriodType.YEARLY, start: yearStart, end: yearEnd });

    // All time
    const allTimeStart = new Date('2025-09-01');
    periods.push({ type: PeriodType.ALL_TIME, start: allTimeStart });

    return periods;
  }

  // Leaderboard methods
  async getUserLeaderboard(limit: number = 20): Promise<UserStats[]> {
    return this.userStatsRepository.find({
      relations: ['user'],
      order: { totalContributions: 'DESC' },
      take: limit,
    });
  }

  async getCollegeLeaderboard(limit: number = 20): Promise<CollegeStats[]> {
    return this.collegeStatsRepository.find({
      relations: ['college'],
      order: { totalContributionsReceived: 'DESC' },
      take: limit,
    });
  }

  async getTradingVolume(periodType: PeriodType, periodStart?: Date): Promise<TradingVolumeStats | null> {
    const query = this.tradingVolumeStatsRepository.createQueryBuilder('stats')
      .where('stats.periodType = :periodType', { periodType });

    if (periodStart) {
      query.andWhere('stats.periodStart = :periodStart', { periodStart });
    } else {
      query.orderBy('stats.periodStart', 'DESC').limit(1);
    }

    return query.getOne();
  }

  async getUserStats(id: number): Promise<UserStats> {
    const userStats = await this.userStatsRepository.findOne({ where: { id } });
    if (!userStats) {
      throw new NotFoundException('User stats not found');
    }
    return userStats;
  }

  async getCollegeStats(id: number): Promise<CollegeStats> {
    const collegeStats = await this.collegeStatsRepository.findOne({ where: { id } });
    if (!collegeStats) {
      throw new NotFoundException('College stats not found');
    }
    return collegeStats;
  }

  async getUserStatsByWalletAddress(walletAddress: string): Promise<UserStats | null> {
    return this.userStatsRepository.findOne({
      where: { walletAddress },
      relations: ['user']
    });
  }

  async getCollegeStatsByWalletAddress(walletAddress: string): Promise<CollegeStats | null> {
    return this.collegeStatsRepository.findOne({
      where: { walletAddress },
      relations: ['college']
    });
  }

  async getRecentTradingVolume(days: number = 7): Promise<TradingVolumeStats[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return this.tradingVolumeStatsRepository.find({
      where: {
        periodType: PeriodType.DAILY,
        periodStart: MoreThanOrEqual(cutoffDate)
      },
      order: { periodStart: 'DESC' }
    });
  }

  async linkUserStatsOnSignup(userId: number, walletAddress: string): Promise<void> {
    try {
      await this.userStatsRepository.query(`
        UPDATE user_stats 
        SET "userId" = $1, "updatedAt" = now()
        WHERE "walletAddress" = $2 AND "userId" IS NULL
      `, [userId, walletAddress]);
  
      this.logger.log(`Linked existing stats to user ${userId} for wallet ${walletAddress}`);
    } catch (error) {
      this.logger.error(`Error linking stats for user ${userId}:`, error);
    }
  }
}