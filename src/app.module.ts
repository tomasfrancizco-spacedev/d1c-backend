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
    FeeManagementModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}