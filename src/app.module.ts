import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CollegeModule } from './college/college.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { StatsModule } from './stats/stats.module';
import { FeeManagementModule } from './fee-management/fee-management.module';
import { D1cWalletModule } from './d1c-wallet/d1c-wallet.module';
import { TransactionModule } from './transaction/transaction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    UserModule,
    CollegeModule,
    AuthModule,
    WebhooksModule,
    StatsModule,
    FeeManagementModule,
    D1cWalletModule,
    TransactionModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}