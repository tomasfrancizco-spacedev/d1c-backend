import { Module } from '@nestjs/common';
import { CollegeService } from './college.service';
import { CollegeController } from './college.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { College } from './entities/college.entity';

@Module({
  imports: [TypeOrmModule.forFeature([College])],
  controllers: [CollegeController],
  providers: [CollegeService],
})
export class CollegeModule {}
