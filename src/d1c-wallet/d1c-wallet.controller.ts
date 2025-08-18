import { Controller, Get, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { D1cWalletService } from './d1c-wallet.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@ApiTags('D1C Wallet')
@Controller('d1c-wallet')
export class D1cWalletController {
  private readonly logger = new Logger(D1cWalletController.name);

  constructor(private readonly d1cWalletService: D1cWalletService) { }

  @Get('/')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get D1C wallet address' })
  @ApiResponse({ status: 200, description: 'D1C wallet address retrieved successfully' })
  async getD1cWallets() {
    try {
      return this.d1cWalletService.findAll();
    } catch (error) {
      this.logger.error('Error getting D1C wallet address:', error);
      throw error;
    }
  }
}