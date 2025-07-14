import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

  createUser(createUserDto: CreateUserDto): Promise<User> {
    const user: User = new User();
    user.email = createUserDto.email;
    user.wallet = createUserDto.wallet;
    user.isActive = createUserDto.isActive;
    user.lastLogin = new Date(); // Set current timestamp for first login
    user.currentLinkedCollege = createUserDto.currentLinkedCollege;
    user.linkedCollegeHistory = createUserDto.linkedCollegeHistory;
    return this.userRepository.save(user);
  }

  findAllUser(): Promise<User[]> {
    return this.userRepository.find();
  }

  /**
   * this function used to get data of use whose id is passed in parameter
   * @param id is type of number, which represent the id of user.
   * @returns promise of user
   */
  viewUser(id: number): Promise<User> {
    return this.userRepository.findOneBy({ id }) as Promise<User>;
  }

  /**
   * this function is used to find a user by email
   * @param email string representing the user's email
   * @returns promise of user or null
   */
  findUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  /**
   * this function updates the lastLogin timestamp when user logs in
   * @param userId the ID of the user logging in
   * @returns promise of updated user
   */
  updateLastLogin(userId: number): Promise<User> {
    return this.userRepository.save({
      id: userId,
      lastLogin: new Date(),
    });
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
      await this.updateLastLogin(existingUser.id);
      return this.viewUser(existingUser.id);
    } else {
      // First login, create new user
      return this.createUser(createUserDto);
    }
  }

  /**
   * this function is used to updated specific user whose id is passed in
   * parameter along with passed updated data
   * @param id is type of number, which represent the id of user.
   * @param updateUserDto this is partial type of createUserDto.
   * @returns promise of udpate user
   */
  updateUser(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user: User = new User();
    user.email = updateUserDto.email ?? '';
    user.wallet = updateUserDto.wallet ?? '';
    user.isActive = updateUserDto.isActive ?? false;
    user.currentLinkedCollege = updateUserDto.currentLinkedCollege ?? '';
    user.linkedCollegeHistory = updateUserDto.linkedCollegeHistory ?? [];
    user.id = id;
    return this.userRepository.save(user);
  }

  /**
   * this function is used to remove or delete user from database.
   * @param id is the type of number, which represent id of user
   * @returns nuber of rows deleted or affected
   */
  removeUser(id: number): Promise<DeleteResult> {
    return this.userRepository.delete(id);
  }
}