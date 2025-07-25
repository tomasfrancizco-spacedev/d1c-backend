import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsDate, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // @IsNotEmpty()
  // @IsArray()
  // @IsString({ each: true })
  // wallets?: string[];

  // @IsNotEmpty()
  // @IsString()
  // walletAddress?: string;

  @IsNotEmpty()
  @IsArray()
  @IsEmail(undefined, { each: true, message: 'Each email must be a valid email' })
  emails?: string[];

  // @IsNotEmpty()
  // @IsEmail(undefined, { message: 'Please provide a valid email' })
  // email?: string;

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
