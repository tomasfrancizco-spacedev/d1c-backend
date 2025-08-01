import { IsNotEmpty, IsString, IsOptional, IsUrl } from "class-validator";

export class CreateCollegeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  commonName: string;

  @IsString()
  nickname: string;
  
  @IsString()
  @IsNotEmpty()
  city: string;
  
  @IsString()
  @IsNotEmpty()
  state: string;
  
  @IsString()
  @IsNotEmpty()
  type: string;
  
  @IsString()
  @IsNotEmpty()
  subdivision: string;

  @IsString()
  @IsNotEmpty()
  primary: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsOptional()
  @IsString()
  @IsUrl({}, { message: 'Logo must be a valid URL' })
  logo?: string;
}
