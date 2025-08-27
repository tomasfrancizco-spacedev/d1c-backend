import { Module, forwardRef } from '@nestjs/common';
import { CollegeService } from './college.service';
import { CollegeController } from './college.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { College } from './entities/college.entity';
import { AuthModule } from 'src/auth/auth.module';
import { UserModule } from 'src/user/user.module';
import { User } from 'src/user/entities/user.entity';
import { Transaction } from 'src/transaction/entities/transaction.entity';
import { CollegeStats } from 'src/stats/entities/college-stats.entity';
import { UserStats } from 'src/stats/entities/user-stats.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([College, User, Transaction, CollegeStats, UserStats]), 
    forwardRef(() => AuthModule),
    forwardRef(() => UserModule)
  ],
  controllers: [CollegeController],
  providers: [CollegeService],
  exports: [CollegeService],
})
export class CollegeModule { }
