import { HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { UserStats } from './entities/user-stats.entity';
import { CollegeStats } from './entities/college-stats.entity';
import { TradingVolumeStats, PeriodType } from './entities/trading-volume-stats.entity';
import { CollegeService } from '../college/college.service';
import { College } from '../college/entities/college.entity';

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

  async updateUserStats(
    userId: number | null,
    walletAddress: string,
    amount: number,
    transactionDate: Date,
    linkedCollege?: College | null
  ): Promise<void> {
    try {
      const collegeId = linkedCollege?.id ?? null;

      // Step 1: Upsert the row for the current college (or community)
      await this.userStatsRepository.query(`
        INSERT INTO user_stats (
          "userId", "walletAddress", "linkedCollegeId", "contributions",
          "totalContributions", "transactionCount", "lastContributionDate", "createdAt", "updatedAt"
        ) VALUES ($1, $2, $3, $4, $4, 1, $5, now(), now())
        ON CONFLICT ON CONSTRAINT "UQ_user_stats_wallet_college_safe"
        DO UPDATE SET
          "contributions" = user_stats."contributions" + EXCLUDED."contributions",
          "totalContributions" = user_stats."totalContributions" + EXCLUDED."totalContributions",
          "transactionCount" = user_stats."transactionCount" + 1,
          "lastContributionDate" = GREATEST(user_stats."lastContributionDate", EXCLUDED."lastContributionDate"),
          "updatedAt" = now()
      `, [userId, walletAddress, collegeId, amount, transactionDate]);
      
      // Paso 2: Obtener el nuevo total acumulado para este wallet
      const result = await this.userStatsRepository.query(`
        SELECT SUM("contributions") as "total" FROM user_stats WHERE "walletAddress" = $1
      `, [walletAddress]);
      
      const newTotal = result?.[0]?.total || 0;
      
      // Paso 3: Actualizar todas las filas del wallet con ese nuevo total
      await this.userStatsRepository.query(`
        UPDATE user_stats 
        SET 
          "totalContributions" = $1,
          "updatedAt" = now()
        WHERE 
          "walletAddress" = $2
      `, [newTotal, walletAddress]);

      const collegeType = linkedCollege ? `linked college ${linkedCollege.name}` : 'community college';
      this.logger.log(`Updated user stats for wallet ${walletAddress} (${collegeType}): +${amount}`);
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
  async getUserLeaderboard(limit: number = 20): Promise<{ success: boolean, data?: UserStats[], statusCode?: number, message?: string }> {
    try {
      // Get top wallet addresses by totalContributions, then pick one row per wallet
      const leaderboard = await this.userStatsRepository.query(`
        WITH top_wallets AS (
          SELECT DISTINCT "walletAddress", "totalContributions"
          FROM user_stats
          ORDER BY "totalContributions" DESC
          LIMIT $1
        ),
        user_stats_with_rank AS (
          SELECT us.*, 
                 ROW_NUMBER() OVER (PARTITION BY us."walletAddress" ORDER BY us.id) as rn
          FROM user_stats us
          INNER JOIN top_wallets tw ON us."walletAddress" = tw."walletAddress"
        )
        SELECT 
          us.id,
          us."userId", 
          us."walletAddress",
          us."linkedCollegeId",
          us."contributions",
          us."totalContributions",
          us."transactionCount",
          us."lastContributionDate",
          us."rankPosition",
          us."createdAt",
          us."updatedAt",
          u.id as "user_id",
          u.emails as "user_emails",
          u."walletAddress" as "user_walletAddress",
          u."isActive" as "user_isActive",
          u."lastLogin" as "user_lastLogin",
          u."currentLinkedCollegeId" as "user_currentLinkedCollegeId",
          c.id as "college_id",
          c.name as "college_name",
          c.nickname as "college_nickname",
          c."commonName" as "college_commonName",
          c.city as "college_city",
          c.state as "college_state",
          c.type as "college_type",
          c.subdivision as "college_subdivision",
          c.primary as "college_primary",
          c."walletAddress" as "college_walletAddress",
          c.logo as "college_logo"
        FROM user_stats_with_rank us
        LEFT JOIN "user" u ON us."userId" = u.id
        LEFT JOIN "college" c ON us."linkedCollegeId" = c.id
        WHERE us.rn = 1
        ORDER BY us."totalContributions" DESC
      `, [limit]);

      // Transform the flat result to include user relation
      const transformedLeaderboard = leaderboard.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        walletAddress: row.walletAddress,
        linkedCollege: row.college_id ? {
          id: row.college_id,
          name: row.college_name,
          nickname: row.college_nickname,
          commonName: row.college_commonName,
          city: row.college_city,
          state: row.college_state,
          type: row.college_type,
          subdivision: row.college_subdivision,
          primary: row.college_primary,
          walletAddress: row.college_walletAddress,
          logo: row.college_logo,
        } : null,
        contributions: parseFloat(row.contributions),
        totalContributions: parseFloat(row.totalContributions),
        transactionCount: row.transactionCount,
        lastContributionDate: row.lastContributionDate,
        rankPosition: row.rankPosition,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        user: row.user_id ? {
          id: row.user_id,
          emails: row.user_emails,
          walletAddress: row.user_walletAddress,
          isActive: row.user_isActive,
          lastLogin: row.user_lastLogin,
          currentLinkedCollegeId: row.user_currentLinkedCollegeId
        } : null
      }));

      return {
        success: true,
        data: transformedLeaderboard
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to get user leaderboard. Please try again.'
      };
    }
  }

  async getCollegeLeaderboard(limit: number = 20): Promise<{ success: boolean, data?: CollegeStats[], statusCode?: number, message?: string }> {
    try {
      const leaderboard = await this.collegeStatsRepository.find({
        relations: ['college'],
        order: { totalContributionsReceived: 'DESC' },
        take: limit,
      });

      return {
        success: true,
        data: leaderboard
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to get college leaderboard. Please try again.'
      };
    }
  }

  async getTradingVolume(periodType: PeriodType, periodStart?: Date): Promise<TradingVolumeStats | null> {
    try {
      const query = this.tradingVolumeStatsRepository.createQueryBuilder('stats')
        .where('stats.periodType = :periodType', { periodType });

      if (periodStart) {
        query.andWhere('stats.periodStart = :periodStart', { periodStart });
      } else {
        query.orderBy('stats.periodStart', 'DESC').limit(1);
      }

      return query.getOne();
    } catch (error) {
      throw new HttpException(
        'Failed to get trading volume. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserStatsByUserId(id: number): Promise<{ success: boolean, data?: UserStats[], statusCode?: number, message?: string }> {
    try {
      const userStats = await this.userStatsRepository.find({ where: { userId: id }, relations: ['user', 'linkedCollege'] });
      if (!userStats) {
        return {
          success: false,
          statusCode: 404,
          message: 'User stats not found'
        };
      }
      return {
        success: true,
        data: userStats
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get user stats. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getCollegeStatsByCollegeId(id: number): Promise<{ success: boolean, data?: CollegeStats, statusCode?: number, message?: string }> {
    try {
      const collegeStats = await this.collegeStatsRepository.findOne({ where: { id } });
      if (!collegeStats) {
        return {
          success: false,
          statusCode: 404,
          message: 'College stats not found'
        };
      }
      return {
        success: true,
        data: collegeStats
      };
    } catch (error) {
      throw new HttpException(
        'Failed to get college stats. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async getUserStatsByWalletAddress(walletAddress: string): Promise<{ success: boolean, data?: UserStats[], statusCode?: number, message?: string }> {
    try {
      const userStats = await this.userStatsRepository.find({
        where: { walletAddress },
        relations: ['user', 'linkedCollege'],
        order: { totalContributions: 'DESC' }
      });

      if (!userStats || userStats.length === 0) {
        return {
          success: false,
          statusCode: 404,
          message: 'User stats not found'
        };
      }
      return {
        success: true,
        data: userStats
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to get user stats by wallet address. Please try again.'
      };
    }
  }

  async getCollegeStatsByWalletAddress(walletAddress: string): Promise<{ success: boolean, data?: CollegeStats, statusCode?: number, message?: string }> {
    try {
      const collegeStats = await this.collegeStatsRepository.findOne({
        where: { walletAddress },
        relations: ['college']
      });
      if (!collegeStats) {
        return {
          success: false,
          statusCode: 404,
          message: 'College stats not found'
        };
      }
      return {
        success: true,
        data: collegeStats
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to get college stats by wallet address. Please try again.'
      };
    }
  }

  async getRecentTradingVolume(days: number = 7): Promise<TradingVolumeStats[]> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      return this.tradingVolumeStatsRepository.find({
        where: {
          periodType: PeriodType.DAILY,
          periodStart: MoreThanOrEqual(cutoffDate)
        },
        order: { periodStart: 'DESC' }
      });
    } catch (error) {
      throw new HttpException(
        'Failed to get recent trading volume. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async linkUserStatsOnSignup(userId: number, walletAddress: string): Promise<{ success: boolean, statusCode?: number, message?: string }> {
    try {
      await this.userStatsRepository.query(`
        UPDATE user_stats 
        SET "userId" = $1, "updatedAt" = now()
        WHERE "walletAddress" = $2 AND "userId" IS NULL
      `, [userId, walletAddress]);

      this.logger.log(`Linked existing stats to user ${userId} for wallet ${walletAddress} (all college rows)`);
      return {
        success: true,
        message: 'User stats linked on signup for all college associations'
      };
    } catch (error) {
      this.logger.error(`Error linking stats for user ${userId}:`, error);
      return {
        success: false,
        statusCode: 500,
        message: 'Failed to link user stats on signup. Please try again.'
      };
    }
  }
}