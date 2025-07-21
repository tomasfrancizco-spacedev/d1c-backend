import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { OtpUtil } from '../utils/otp.util';
import { UserService } from 'src/user/user.service';

@Injectable()
export class UserAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private userService: UserService,
  ) { }

  // Create or update user with OTP
  async createOrUpdateUserWithOtp(email: string, walletAddress: string): Promise<string> {
    const otpCode = OtpUtil.generateOtp();
    const otpExpiration = OtpUtil.getExpirationTime();

    let user = await this.userService.findUserByEmail(email);

    if (user) {
      // Update existing user with wallets logic + OTP
      const updatedWallets = user.wallets?.includes(walletAddress) ? user.wallets : [...(user.wallets || []), walletAddress];

      await this.userService.updateUser(user.id, {
        wallets: updatedWallets,
        walletAddress,
        otpCode,
        otpExpiration,
      });
    } else {
      // Create new user via UserService
      user = await this.userService.createUser({
        email,
        walletAddress,
        wallets: [walletAddress],
        lastLogin: null,
        isActive: false,
        currentLinkedCollege: null,
        linkedCollegeHistory: [],
        otpCode,
        otpExpiration
      });
    }

    return otpCode; // Return raw OTP for email sending
  }

  // Verify OTP and clear it from database
  async verifyOtp(email: string, otpCode: string): Promise<User> {
    const user = await this.userService.findUserByEmail(email);

    if (!user ||
      !user.otpCode ||
      (user.otpExpiration && OtpUtil.isExpired(user.otpExpiration))) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (user.otpCode !== otpCode) {
      await this.userService.updateUser(user.id, {
        otpCode: null,
        otpExpiration: null
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP and update last login
    await this.userService.updateUser(user.id, {
      otpCode: null,
      otpExpiration: null,
      lastLogin: new Date(),
      isActive: true
    });

    // Return updated user
    const updatedUser = await this.userService.findUserByEmail(email);
    if (!updatedUser) {
      throw new UnauthorizedException('User not found after verification');
    }
    return updatedUser;
  }
} 