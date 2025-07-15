import { Injectable } from '@nestjs/common';
import { CreateCollegeDto } from './dto/create-college.dto';
import { UpdateCollegeDto } from './dto/update-college.dto';

@Injectable()
export class CollegeService {
  create(createCollegeDto: CreateCollegeDto) {
    return 'This action adds a new college';
  }

  findAll() {
    return `This action returns all college`;
  }

  findOne(id: number) {
    return `This action returns a #${id} college`;
  }

  update(id: number, updateCollegeDto: UpdateCollegeDto) {
    return `This action updates a #${id} college`;
  }

  remove(id: number) {
    return `This action removes a #${id} college`;
  }
}
