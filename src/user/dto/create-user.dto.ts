import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsArray,
  Matches,
  IsOptional,
  ArrayNotEmpty,
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
    message: 'Wallet must be a valid Solana address (32-44 base58 characters)',
  })
  wallet: string;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Current linked college must be a valid Solana address (32-44 base58 characters)',
  })
  currentLinkedCollege: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty({ message: 'Linked college history cannot be empty if provided' })
  @IsString({ each: true })
  @Matches(SOLANA_ADDRESS_REGEX, {
    each: true,
    message: 'Each linked college history entry must be a valid Solana address (32-44 base58 characters)',
  })
  linkedCollegeHistory: string[];
}