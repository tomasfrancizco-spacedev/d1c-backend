import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return await this.userRepository.save({
      email: createUserDto.email,
      walletAddress: createUserDto.walletAddress,
      wallets: createUserDto.wallets,
      lastLogin: createUserDto.lastLogin,
      isActive: createUserDto.isActive,
      currentLinkedCollege: createUserDto.currentLinkedCollege,
      linkedCollegeHistory: createUserDto.linkedCollegeHistory,
      otpCode: createUserDto.otpCode,
      otpExpiration: createUserDto.otpExpiration,
    } as DeepPartial<User>);
  }

  async findAllUser(): Promise<User[]> {
    return await this.userRepository.find();
  }

  /**
   * this function used to get data of user whose id is passed in parameter
   * @param id is type of number, which represent the id of user.
   * @returns promise of user
   */
  async viewUser(id: number): Promise<User | null> {
    return await this.userRepository.findOne({ where: { id } });
  }

  /**
   * this function is used to find a user by email
   * @param email string representing the user's email
   * @returns promise of user or null
   */
  async findUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  /**
   * this function is used to find a user by wallet address
   * @param walletAddress string representing the user's wallet address
   * @returns promise of user or null
   */
  async findUserByWalletAddress(walletAddress: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { walletAddress } });
  }

  /**
   * this function updates the lastLogin timestamp when user logs in
   * @param userId the ID of the user logging in
   * @returns promise of updated user
   */
  async updateLastLogin(userId: number): Promise<User | null> {
    await this.userRepository.update(userId, { lastLogin: new Date() });
    return await this.viewUser(userId);
  }

  /**
   * this function handles user login - creates user on first login or updates lastLogin
   * @param email user's email
   * @param createUserDto user data for first-time login
   * @returns promise of user
   */
  async handleUserLogin(email: string, createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.findUserByEmail(email);
    
    if (existingUser) {
      // User exists, update lastLogin
      const updatedUser = await this.updateLastLogin(existingUser.id);
      return updatedUser || existingUser; // Return updated user or fallback to existing user
    } else {
      // First login, create new user
      return await this.createUser(createUserDto);
    }
  }

  /**
   * this function is used to updated specific user whose id is passed in
   * parameter along with passed updated data
   * @param id is type of number, which represent the id of user.
   * @param updateUserDto this is partial type of createUserDto.
   * @returns promise of update user
   */
  async updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User | null> {
    const updateResult = await this.userRepository.update(id, updateUserDto);
    
    if (updateResult.affected && updateResult.affected > 0) {
      return await this.viewUser(id);
    }
    
    return null;
  }

  /**
   * this function is used to remove or delete user from database.
   * @param id is the type of number, which represent id of user
   * @returns number of rows deleted or affected
   */
  async removeUser(id: number): Promise<DeleteResult> {
    return await this.userRepository.delete(id);
  }
}