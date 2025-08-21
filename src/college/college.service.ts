import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCollegeDto } from './dto/create-college.dto';
import { UpdateCollegeDto } from './dto/update-college.dto';
import { College } from './entities/college.entity';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Transaction } from 'src/transaction/entities/transaction.entity';          

@Injectable()
export class CollegeService {
  constructor(
    @InjectRepository(College) private readonly collegeRepository: Repository<College>,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Transaction) private readonly transactionRepository: Repository<Transaction>,   
  ) {}

  async create(createCollegeDto: CreateCollegeDto): Promise<College> {
    return await this.collegeRepository.save({
      name: createCollegeDto.name,
      commonName: createCollegeDto.commonName,
      nickname: createCollegeDto.nickname,
      city: createCollegeDto.city,
      state: createCollegeDto.state,
      type: createCollegeDto.type,
      subdivision: createCollegeDto.subdivision,
      primary: createCollegeDto.primary,
      walletAddress: createCollegeDto.walletAddress,
    } as DeepPartial<College>);
  }

  async findAll(limit: number, offset: number): Promise<{success: boolean, data: College[], total: number, limit: number, offset: number}> {
    try{
      const [colleges, total] = await this.collegeRepository.findAndCount({
        skip: offset,
        take: limit,
      });
      return {
        success: true,
        data: colleges,
        total: total,
        limit: limit,
        offset: offset,
      };
    } catch (error) {
      return {
        success: false,
        data: error.message,
        total: 0,
        limit: limit,
        offset: offset,
      };
    }
    
  }

  async findOne(id: number): Promise<College | null> {
    return await this.collegeRepository.findOne({ where: { id } });
  }

  async findByWalletAddress(walletAddress: string): Promise<College | null> {
    return this.collegeRepository.findOne({
      where: { walletAddress }
    });
  }

  async updateCollege(id: number, updateCollegeDto: UpdateCollegeDto): Promise<College | null> {
    const updateResult = await this.collegeRepository.update(id, updateCollegeDto);
    
    if (updateResult.affected && updateResult.affected > 0) {
      return await this.findOne(id);
    }
    
    return null;
  }

  async remove(id: number): Promise<DeleteResult> {
    // Check for users linked to this college
    const usersCount = await this.userRepository.count({
      where: { currentLinkedCollege: { id } }
    });
    if (usersCount > 0) {
      throw new BadRequestException(`Cannot delete college: ${usersCount} users are linked to it`);
    }

    // Check for transactions linked to this college that are not fully processed
    const transactionsCount = await this.transactionRepository.count({
      where: [
        {
          linkedCollege: { id },
          fee_harvested: false,
        },
        {
          linkedCollege: { id },
          fee_distributed: false,
        },
      ],
    });
    if (transactionsCount > 0) {
      throw new BadRequestException(`Cannot delete college: ${transactionsCount} transactions are linked to it`);
    }

    return await this.collegeRepository.delete(id);
  }
}
