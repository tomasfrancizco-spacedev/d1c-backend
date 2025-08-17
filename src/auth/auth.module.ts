import { forwardRef, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { EmailService } from './services/email.service';
import { UserAuthService } from './services/user-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UserModule } from 'src/user/user.module';
import { StatsModule } from 'src/stats/stats.module';
import { AdminGuard } from './guards/admin.guard';

@Module({
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => StatsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET', 'super-secret-jwt-key-change-in-production'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', '1d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, EmailService, UserAuthService, JwtAuthGuard, AdminGuard],
  exports: [AuthService, UserAuthService, JwtAuthGuard, AdminGuard],
})
export class AuthModule {} 