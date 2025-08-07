import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsDate, IsEmail, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { College } from '../../college/entities/college.entity';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @IsArray()
  @IsEmail(undefined, { each: true, message: 'Each email must be a valid email' })
  emails?: string[];

  @IsOptional()
  @IsString()
  otpCode?: string | null;
  
  @IsOptional()
  @IsDate()
  otpExpiration?: Date | null;

  @IsOptional()
  @IsDate()
  lastLogin?: Date | null;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  currentLinkedCollege?: College | null;
}
