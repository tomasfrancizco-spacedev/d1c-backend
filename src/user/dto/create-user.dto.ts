import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsArray,
  Matches,
  IsOptional,
  ArrayNotEmpty,
  IsDate,
} from 'class-validator';

// Solana address regex pattern - base58 encoded, 32-44 characters
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @IsEmail(undefined, { message: 'Please provide a valid email' })
  email: string;

  @IsNotEmpty()
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Wallet address must be a valid Solana address (32-44 base58 characters)',
  })
  walletAddress: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @Matches(SOLANA_ADDRESS_REGEX, {
    each: true,
    message: 'Each wallet address must be a valid Solana address (32-44 base58 characters)',
  })
  wallets: string[];

  @IsBoolean()
  isActive: boolean;

  @IsNotEmpty()
  @IsString()
  otpCode: string | null;

  @IsNotEmpty()
  @IsDate()
  otpExpiration: Date | null;

  @IsOptional()
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Current linked college must be a valid Solana address (32-44 base58 characters)',
  })
  currentLinkedCollege: string | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(SOLANA_ADDRESS_REGEX, {
    each: true,
    message: 'Each linked college history entry must be a valid Solana address (32-44 base58 characters)',
  })
  linkedCollegeHistory: string[] | null;

  @IsOptional()
  @IsDate()
  lastLogin: Date | null;
}