import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { PeriodType } from './entities/trading-volume-stats.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) { }

  @Get('user-leaderboard')
  @ApiOperation({ summary: 'Get user leaderboard by total contributions' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of users to return (default: 20)' })
  @ApiResponse({ status: 200, description: 'User leaderboard retrieved successfully' })
  findAllUser(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return this.statsService.getUserLeaderboard(limitNum);
  }

  @Get('college-leaderboard')
  @ApiOperation({ summary: 'Get college leaderboard by total contributions' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of colleges to return (default: 20)' })
  @ApiResponse({ status: 200, description: 'College leaderboard retrieved successfully' })
  findAllCollege() {
    return this.statsService.getCollegeLeaderboard();
  }

  @Get('user-stats/user-id/:id')
  @ApiOperation({ summary: 'Get user stats by user ID' })
  @ApiParam({ name: 'id', required: true, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User stats retrieved successfully' })
  findAllUserStatsByUserId(@Param('id') id: string) {
    return this.statsService.getUserStats(+id);
  }

  @Get('user-stats/wallet/:address')
  @ApiOperation({ summary: 'Get user stats by wallet address' })
  @ApiParam({ name: 'address', required: true, description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'User stats retrieved successfully' })
  findAllUserStatsByWalletAddress(@Param('address') address: string) {
    return this.statsService.getUserStatsByWalletAddress(address);
  }

  @Get('college-stats/:id')
  @ApiOperation({ summary: 'Get college stats by college ID' })
  @ApiParam({ name: 'id', required: true, description: 'College ID' })
  @ApiResponse({ status: 200, description: 'College stats retrieved successfully' })
  findAllCollegeStats(@Param('id') id: string) {
    return this.statsService.getCollegeStats(+id);
  }

  @Get('college-stats/wallet/:address')
  @ApiOperation({ summary: 'Get college stats by wallet address' })
  @ApiParam({ name: 'address', required: true, description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'College stats retrieved successfully' })
  findAllCollegeStatsByWalletAddress(@Param('address') address: string) {
    return this.statsService.getCollegeStatsByWalletAddress(address);
  }

  @Get('trading-volume')
  @ApiOperation({ summary: 'Get trading volume by period type and start date' })
  @ApiQuery({ name: 'periodType', required: true, description: 'Period type (daily, weekly, monthly)' })
  @ApiQuery({ name: 'periodStart', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Trading volume retrieved successfully' })
  findAllTradingVolume(
    @Query('periodType') periodType: PeriodType,
    @Query('periodStart') periodStart?: string
  ) {
    const startDate = periodStart ? new Date(periodStart) : undefined;
    return this.statsService.getTradingVolume(periodType, startDate);
  }

  @Get('trading-volume/recent')
  @ApiOperation({ summary: 'Get recent trading volume by number of days' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to return (default: 7)' })
  @ApiResponse({ status: 200, description: 'Recent trading volume retrieved successfully' })
  getRecentActivity(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.statsService.getRecentTradingVolume(daysNum);
  }
}