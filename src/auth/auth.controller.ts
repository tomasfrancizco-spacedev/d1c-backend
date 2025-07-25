import { Body, Controller, Post, Get, UseGuards, ConflictException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserAuthService } from './services/user-auth.service';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { WalletSigninDto } from './dto/wallet-signin.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private userAuthService: UserAuthService,
    private authService: AuthService,
    private emailService: EmailService,
  ) { }

  // Step 1: Wallet + Email signin
  @Post('wallet-signin')
  @ApiOperation({ summary: 'Sign in with wallet and email' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent to email',
    schema: {
      example: { success: true, message: 'OTP sent to your email' }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({
    status: 409,
    description: 'Wallet address already registered with another email',
    schema: {
      example: {
        success: false,
        message: 'This wallet address is already registered with another email address.',
        code: 'WALLET_ALREADY_REGISTERED'
      }
    }
  })
  async walletSignin(@Body() dto: WalletSigninDto) {
    try {
      // Create/update user and generate OTP
      const otpCode = await this.userAuthService.createOrUpdateUserWithOtp(
        dto.email,
        dto.walletAddress,
      );

      // Send OTP via email
      await this.emailService.sendOtp(dto.email, otpCode);

      return { success: true, message: 'OTP sent to your email' };
    } catch (error) {
      console.error('❌ Error in wallet signin:', error);

      // Handle specific wallet conflict error
      if (error instanceof ConflictException) {
        throw new ConflictException({
          success: false,
          message: error.message,
          code: 'WALLET_ALREADY_REGISTERED'
        });
      }

      throw error;
    }
  }

  // Step 2: Verify OTP and get JWT
  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and get authentication token' })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    schema: {
      example: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: 1,
          email: 'user@example.com',
          walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    try {
      // Validate OTP
      const user = await this.userAuthService.verifyOtp(dto.walletAddress, dto.email, dto.otpCode);

      // Generate JWT
      const token = this.authService.generateToken({
        id: user.id,
        email: user.emails[user.emails.length - 1],
        walletAddress: user.walletAddress
      });

      return {
        success: true,
        token,
        user: {
          id: user.id,
          email: user.emails[user.emails.length - 1],
          walletAddress: user.walletAddress,
          isActive: user.isActive,
          lastLogin: user.lastLogin
        }
      };
    } catch (error) {
      console.error('❌ Error in verify OTP:', error);
      throw error;
    }
  }

  // Protected route example
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile (protected route example)' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved',
    schema: {
      example: {
        id: 1,
        email: 'user@example.com',
        walletAddress: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: any) {
    return {
      id: user.sub,
      email: user.email,
      walletAddress: user.walletAddress
    };
  }
} 