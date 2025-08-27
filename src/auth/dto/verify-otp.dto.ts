import { IsEmail, IsString, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SOLANA_ADDRESS_REGEX } from 'src/utils/solanaAddressRegex';


export class VerifyOtpDto {
  @ApiProperty({
    description: 'Solana wallet address',
    example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
  })
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Wallet address must be a valid Solana address (32-44 base58 characters)',
  })
  walletAddress: string;
  
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456'
  })
  @IsString()
  @Length(6, 6, { message: 'OTP code must be exactly 6 digits' })
  otpCode: string;
} 