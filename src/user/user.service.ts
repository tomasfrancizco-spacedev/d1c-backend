import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { College } from '../college/entities/college.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(College) private readonly collegeRepository: Repository<College>,
  ) { }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      let currentLinkedCollege: College | null = null;
      
      if (createUserDto.currentLinkedCollegeId) {
        currentLinkedCollege = await this.collegeRepository.findOne({
          where: { id: createUserDto.currentLinkedCollegeId }
        });
        
        if (!currentLinkedCollege) {
          throw new HttpException(
            'College not found',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const user = await this.userRepository.save({
        walletAddress: createUserDto.walletAddress,
        emails: createUserDto.emails,
        lastLogin: createUserDto.lastLogin,
        isActive: createUserDto.isActive,
        currentLinkedCollege: currentLinkedCollege,
        otpCode: createUserDto.otpCode,
        otpExpiration: createUserDto.otpExpiration,
      } as DeepPartial<User>);

      return user;
    } catch (error) {
      throw new HttpException(
        'Failed to create user. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findAllUser(): Promise<User[]> {
    try {
      const users = await this.userRepository.find({ relations: ['currentLinkedCollege'] });
      return users;
    } catch (error) {
      throw new HttpException(
        'Failed to find all users. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    } 
  }

  async viewUser(id: number): Promise<User | null> {
    try {
      const user = await this.userRepository.findOne({ where: { id }, relations: ['currentLinkedCollege'] });
      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      throw new HttpException(
        'Failed to view user. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findUsersByEmail(email: string): Promise<User[] | null> {
    try {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .where(':email = ANY(user.emails)', { email })
        .getMany();
      if (!users) {
        return null;
      }
      return users;
    } catch (error) {
      throw new HttpException(
        'Failed to find users by email. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async findUserByWalletAddress(walletAddress: string): Promise<User | null> {
    try{
      const user = await this.userRepository.findOne({ 
        where: { walletAddress },
        relations: ['currentLinkedCollege']
      }); 
      if (!user) {
        return null;
      }
      return user;
    } catch (error) {
      throw new HttpException(
        'Failed to find user by wallet address. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async updateLastLogin(userId: number): Promise<User | null> {
    try {
      const updatedUser = await this.userRepository.update(userId, { lastLogin: new Date() });
      if (updatedUser.affected && updatedUser.affected > 0) {
        return await this.viewUser(userId);
      }
      return null;
    } catch (error) {
      throw new HttpException(
        'Failed to update last login. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async handleUserLogin(walletAddress: string, createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findUserByWalletAddress(walletAddress);

    if (existingUser) {
      const updatedUser = await this.updateLastLogin(existingUser.id);
      return updatedUser || existingUser;
    } else {
      return await this.createUser(createUserDto);
    }
  }

  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    try {
      const updateResult = await this.userRepository.update(id, updateUserDto);
      if (updateResult.affected && updateResult.affected > 0) {
        return await this.viewUser(id);
      }
      return null;
    } catch (error) {
      throw new HttpException(
        'Failed to update user. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async removeUser(id: number): Promise<DeleteResult | null> {
    try {
      const deletedUser = await this.userRepository.delete(id);
      if (deletedUser.affected && deletedUser.affected > 0) {
        return deletedUser;
      }
      return null;
    } catch (error) {
      throw new HttpException(
        'Failed to remove user. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}