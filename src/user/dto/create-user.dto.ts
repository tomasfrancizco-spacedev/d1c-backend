import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsBoolean,
  IsArray,
  Matches,
  IsOptional,
  IsDate,
} from 'class-validator';
import { SOLANA_ADDRESS_REGEX } from 'src/utils/solanaAddressRegex';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  @Matches(SOLANA_ADDRESS_REGEX, {
    message: 'Wallet address must be a valid Solana address (32-44 base58 characters)',
  })
  walletAddress: string;

  @IsNotEmpty()
  @IsArray()
  @IsEmail(undefined, { each: true, message: 'Each email must be a valid email' })
  emails: string[];

  @IsBoolean()
  isActive: boolean;

  @IsNotEmpty()
  @IsString()
  otpCode: string | null;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
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
  @Type(() => Date)
  lastLogin: Date | null;
}