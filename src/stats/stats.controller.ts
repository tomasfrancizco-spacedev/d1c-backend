import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { PeriodType } from './entities/trading-volume-stats.entity';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam, ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from 'src/auth/guards/admin.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) { }

  @Get('user-leaderboard')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user leaderboard by total contributions' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of users to return (default: 20)' })
  @ApiResponse({ status: 200, description: 'User leaderboard retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async findAllUser(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.statsService.getUserLeaderboard(limitNum);
  }

  @Get('college-leaderboard')
  @ApiOperation({ summary: 'Get college leaderboard by total contributions' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of colleges to return (default: 20)' })
  @ApiResponse({ status: 200, description: 'College leaderboard retrieved successfully' })
  async findAllCollege(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 20;
    return await this.statsService.getCollegeLeaderboard(limitNum);
  }

  @Get('user-stats/user-id/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user stats by user ID' })
  @ApiParam({ name: 'id', required: true, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User stats retrieved successfully' })
  async findAllUserStatsByUserId(@Param('id') id: string) {
    return await this.statsService.getUserStatsByUserId(+id);
  }

  @Get('user-stats/wallet/:address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user stats by wallet address' })
  @ApiParam({ name: 'address', required: true, description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'User stats retrieved successfully' })
  // /v1/stats/user-stats/wallet/0x1234567890123456789012345678901234567890
  async findAllUserStatsByWalletAddress(@Param('address') address: string) {
    return await this.statsService.getUserStatsByWalletAddress(address);
  }

  @Get('college-stats/college-id/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get college stats by college ID' })
  @ApiParam({ name: 'id', required: true, description: 'College ID' })
  @ApiResponse({ status: 200, description: 'College stats retrieved successfully' })
  async findAllCollegeStatsByCollegeId(@Param('id') id: string) {
    return await this.statsService.getCollegeStatsByCollegeId(+id);
  }

  @Get('college-stats/wallet/:address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get college stats by wallet address' })
  @ApiParam({ name: 'address', required: true, description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'College stats retrieved successfully' })
  async findAllCollegeStatsByWalletAddress(@Param('address') address: string) {
    return await this.statsService.getCollegeStatsByWalletAddress(address);
  }

  @Get('trading-volume')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get trading volume by period type and start date' })
  @ApiQuery({ name: 'periodType', required: true, description: 'Period type (daily, weekly, monthly)' })
  @ApiQuery({ name: 'periodStart', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiResponse({ status: 200, description: 'Trading volume retrieved successfully' })
  async findAllTradingVolume(
    @Query('periodType') periodType: PeriodType,
    @Query('periodStart') periodStart?: string
  ) {
    const startDate = periodStart ? new Date(periodStart) : undefined;
    return await this.statsService.getTradingVolume(periodType, startDate);
  }

  @Get('trading-volume/recent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get recent trading volume by number of days' })
  @ApiQuery({ name: 'days', required: false, description: 'Number of days to return (default: 7)' })
  @ApiResponse({ status: 200, description: 'Recent trading volume retrieved successfully' })
  async getRecentTradingVolume(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return await this.statsService.getRecentTradingVolume(daysNum);
  }
}