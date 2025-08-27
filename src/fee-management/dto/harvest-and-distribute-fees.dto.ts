import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class HarvestAndDistributeFeesDto {
  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  useTransactionBased?: boolean;
}