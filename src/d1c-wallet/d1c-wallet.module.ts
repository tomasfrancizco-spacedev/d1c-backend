import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { D1cWallet } from './entities/d1c-wallet.entity';
import { D1cWalletService } from './d1c-wallet.service';
import { D1cWalletController } from './d1c-wallet.controller';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([D1cWallet]),
    AuthModule,
    forwardRef(() => UserModule)
  ],
  controllers: [D1cWalletController],
  providers: [D1cWalletService],
  exports: [D1cWalletService],
})
export class D1cWalletModule {} 