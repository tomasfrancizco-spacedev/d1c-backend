import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsDate, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  wallets?: string[];

  @IsNotEmpty()
  @IsString()
  walletAddress?: string;

  @IsNotEmpty()
  @IsString()
  otpCode?: string | null;

  @IsNotEmpty()
  @IsDate()
  otpExpiration?: Date | null;

  @IsOptional()
  @IsDate()
  lastLogin?: Date | null;
}
