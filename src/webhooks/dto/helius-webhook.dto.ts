import { IsArray, IsObject, IsString, IsNumber, IsOptional } from 'class-validator';

export class HeliusWebhookDto {
  @IsArray()
  accountData: any[];

  @IsArray()
  events: any[];

  @IsArray()
  instructions: any[];

  @IsArray()
  nativeTransfers: any[];

  @IsString()
  signature: string;

  @IsNumber()
  slot: number;

  @IsString()
  timestamp: string;

  @IsArray()
  tokenTransfers: any[];

  @IsString()
  type: string;

  @IsOptional()
  @IsObject()
  meta?: any;
}