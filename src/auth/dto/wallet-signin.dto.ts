import { IsEmail, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Solana address regex pattern - base58 encoded, 32-44 characters
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class WalletSigninDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com'
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Solana wallet address',
    example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM'
  })
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Wallet address must be a valid Solana address (32-44 base58 characters)',
  })
  walletAddress: string;
} 