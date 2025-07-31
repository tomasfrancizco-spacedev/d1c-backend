import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) { }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = await this.userRepository.save({
        walletAddress: createUserDto.walletAddress,
        emails: createUserDto.emails,
        lastLogin: createUserDto.lastLogin,
        isActive: createUserDto.isActive,
        currentLinkedCollege: createUserDto.currentLinkedCollege,
        linkedCollegeHistory: createUserDto.linkedCollegeHistory,
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
    return await this.userRepository.find();
  }

  async viewUser(id: number): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  async findUsersByEmail(email: string): Promise<User[] | null> {
    return await this.userRepository
      .createQueryBuilder('user')
      .where(':email = ANY(user.emails)', { email })
      .getMany();
  }

  async findUserByWalletAddress(walletAddress: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { walletAddress } });
  }

  async updateLastLogin(userId: number): Promise<User | null> {
    try {
      await this.userRepository.update(userId, { lastLogin: new Date() });
      return await this.viewUser(userId);
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

  async removeUser(id: number): Promise<DeleteResult> {
    try {
      return await this.userRepository.delete(id);
    } catch (error) {
      throw new HttpException(
        'Failed to remove user. Please try again.',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}