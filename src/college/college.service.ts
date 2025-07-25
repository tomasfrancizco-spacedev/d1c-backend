import { Injectable } from '@nestjs/common';
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

  async findAll(): Promise<College[]> {
    return await this.collegeRepository.find();
  }

  async findOne(id: number): Promise<College | null> {
    return await this.collegeRepository.findOne({ where: { id } });
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
