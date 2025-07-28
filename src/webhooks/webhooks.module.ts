import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { UserModule } from '../user/user.module';
import { TransactionModule } from '../transaction/transaction.module';
import { D1cWalletModule } from '../d1c-wallet/d1c-wallet.module';
import { StatsModule } from '../stats/stats.module';

@Module({
  imports: [
    UserModule,
    TransactionModule,
    D1cWalletModule,
    StatsModule
  ],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}