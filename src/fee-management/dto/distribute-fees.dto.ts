import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { SOLANA_ADDRESS_REGEX } from 'src/utils/solanaAddressRegex';

export class DistributeFeesDto {
  @ApiProperty({ example: 'TOKEN_ACCOUNT_ADDRESS', pattern: SOLANA_ADDRESS_REGEX.source })
  @IsString()
  @IsNotEmpty()
  sourceTokenAccount: string;
}