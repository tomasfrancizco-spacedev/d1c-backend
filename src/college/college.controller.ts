import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CollegeService } from './college.service';
import { CreateCollegeDto } from './dto/create-college.dto';
import { UpdateCollegeDto } from './dto/update-college.dto';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('college')
export class CollegeController {
  constructor(private readonly collegeService: CollegeService) {}

  @Post()
  create(@Body() createCollegeDto: CreateCollegeDto) {
    return this.collegeService.create(createCollegeDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all colleges' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of colleges to return (default: 20)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Number of colleges to skip (default: 0)' })
  @ApiResponse({ status: 200, description: 'Colleges retrieved successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const limitNum = limit ? parseInt(limit) : 20;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.collegeService.findAll(limitNum, offsetNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.collegeService.findOne(+id);
  }

  @Patch('/update/:id')
  update(@Param('id') id: string, @Body() updateCollegeDto: UpdateCollegeDto) {
    return this.collegeService.updateCollege(+id, updateCollegeDto);
  }

  @Delete('/delete/:id')
  remove(@Param('id') id: string) {
    return this.collegeService.remove(+id);
  }
}
