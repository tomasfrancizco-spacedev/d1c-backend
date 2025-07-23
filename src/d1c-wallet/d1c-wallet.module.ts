import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { D1cWallet } from './entities/d1c-wallet.entity';
import { D1cWalletService } from './d1c-wallet.service';

@Module({
  imports: [TypeOrmModule.forFeature([D1cWallet])],
  providers: [D1cWalletService],
  exports: [D1cWalletService],
})
export class D1cWalletModule {} 