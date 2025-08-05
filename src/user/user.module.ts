import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { College } from '../college/entities/college.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, College])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}