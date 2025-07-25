import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { User } from '../../utils/user/entities/user.entity';
import { OtpUtil } from '../utils/otp.util';
import { UserService } from 'src/utils/user/user.service';

@Injectable()
export class UserAuthService {
  constructor(
    private userService: UserService,
  ) { }

  // Create or update user with OTP
  async createOrUpdateUserWithOtp(email: string, walletAddress: string): Promise<string> {
    const otpCode = OtpUtil.generateOtp();
    const otpExpiration = OtpUtil.getExpirationTime();

    let user = await this.userService.findUserByWalletAddress(walletAddress);

    if (user) {
      // // User exists - check if they're trying to change their wallet
      // if (user.walletAddress !== walletAddress) {
      //   // They're trying to use a different wallet - check if it's already taken
      //   const existingWalletUser = await this.userService.findUserByWalletAddress(walletAddress);
      //   if (existingWalletUser && existingWalletUser.email !== email) {
      //     throw new ConflictException(`This wallet address is already registered with another email address.`);
      //   }
      // }

      // Update existing user with wallets logic + OTP
      const updatedEmails = user.emails?.includes(email) ? user.emails : [...(user.emails || []), email];

      await this.userService.updateUser(user.id, {
        emails: updatedEmails,
        otpCode,
        otpExpiration,
      });
    } else {
      // Create new user via UserService
      user = await this.userService.createUser({
        walletAddress,
        emails: [email],
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
  async verifyOtp(walletAddress: string, email: string, otpCode: string): Promise<User> {
    const user = await this.userService.findUserByWalletAddress(walletAddress);

    if (!user ||
      !user.otpCode ||
      (user.otpExpiration && OtpUtil.isExpired(user.otpExpiration))) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (!user.emails.includes(email)) {
      throw new UnauthorizedException('Invalid email');
    }

    if (user.otpCode !== otpCode) {
      await this.userService.updateUser(user.id, {
        otpCode: null,
        otpExpiration: null
      });
      throw new UnauthorizedException('Invalid OTP');
    }

    // TODO: add 5 minutes time to request again OTP

    // Clear OTP and update last login
    await this.userService.updateUser(user.id, {
      otpCode: null,
      otpExpiration: null,
      lastLogin: new Date(),
      isActive: true
    });

    // Return updated user
    const updatedUser = await this.userService.findUserByWalletAddress(walletAddress);
    if (!updatedUser) {
      throw new UnauthorizedException('User not found after verification');
    }
    return updatedUser;
  }
} 