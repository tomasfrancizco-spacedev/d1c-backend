import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCollegeDto } from './dto/create-college.dto';
import { UpdateCollegeDto } from './dto/update-college.dto';
import { College } from './entities/college.entity';
import { DeepPartial, DeleteResult, Repository } from 'typeorm';

@Injectable()
export class CollegeService {
  constructor(
    @InjectRepository(College) private readonly collegeRepository: Repository<College>,
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
    return await this.collegeRepository.delete(id);
  }
} 
