import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdminGuard } from 'src/auth/guards/admin.guard';

@ApiTags('Users')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get all users',
    description: 'Retrieves a list of all registered users in the system.'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Users retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          emails: { type: 'array', items: { type: 'string' }, example: ['user@example.com'] },
          walletAddress: { type: 'string', example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' },
          isActive: { type: 'boolean', example: true },
          lastLogin: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z', nullable: true },
          currentLinkedCollege: { 
            type: 'object', 
            nullable: true,
            properties: {
              id: { type: 'number', example: 1 },
              name: { type: 'string', example: 'University of California, Los Angeles' },
              commonName: { type: 'string', example: 'UCLA' },
              nickname: { type: 'string', example: 'Bruins' },
              city: { type: 'string', example: 'Los Angeles' },
              state: { type: 'string', example: 'CA' },
              walletAddress: { type: 'string', example: '7xKUo8QzGhzB2vY1NdR9eF5tA3cW8pL6mS4jH9qK1rE2' }
            }
          },

          otpCode: { type: 'string', example: null, nullable: true },
          otpExpiration: { type: 'string', format: 'date-time', example: null, nullable: true },
          createdAt: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00.000Z' },
          updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' }
        }
      }
    }
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findAll(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    const limitNum = limit ? parseInt(limit) : 20;
    const offsetNum = offset ? parseInt(offset) : 0;
    return this.userService.findAllUser(limitNum, offsetNum);
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all admins' })
  @ApiResponse({ status: 200, description: 'Admins retrieved successfully' })
  findAllAdmins() {
    return this.userService.findAllAdmins();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Get user by ID',
    description: 'Retrieves detailed information for a specific user by their user ID.'
  })
  @ApiParam({ 
    name: 'id', 
    required: true, 
    description: 'User ID',
    type: 'number',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        emails: { type: 'array', items: { type: 'string' }, example: ['user@example.com'] },
        walletAddress: { type: 'string', example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' },
        isActive: { type: 'boolean', example: true },
        lastLogin: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z', nullable: true },
        currentLinkedCollege: { 
          type: 'object', 
          nullable: true,
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'University of California, Los Angeles' },
            commonName: { type: 'string', example: 'UCLA' },
            nickname: { type: 'string', example: 'Bruins' },
            city: { type: 'string', example: 'Los Angeles' },
            state: { type: 'string', example: 'CA' },
            walletAddress: { type: 'string', example: '7xKUo8QzGhzB2vY1NdR9eF5tA3cW8pL6mS4jH9qK1rE2' }
          }
        },
        otpCode: { type: 'string', example: null, nullable: true },
        otpExpiration: { type: 'string', format: 'date-time', example: null, nullable: true },
        createdAt: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00.000Z' },
        updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' }
      },
      nullable: true
    }
  })
  @ApiResponse({ status: 404, description: 'User not found (returns null)' })
  @ApiResponse({ status: 400, description: 'Invalid user ID format' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  findOne(@Param('id') id: string) {
    return this.userService.viewUser(+id);
  }

  @Get('wallet/:address')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user by wallet address' })
  @ApiParam({ name: 'address', required: true, description: 'Wallet address' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  findOneByWalletAddress(@Param('address') address: string) {
    return this.userService.findUserByWalletAddress(address);
  }

  @Patch('/update/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Update user',
    description: 'Updates user information. Only provided fields will be updated. Returns null if user not found.'
  })
  @ApiParam({ 
    name: 'id', 
    required: true, 
    description: 'User ID',
    type: 'number',
    example: 1
  })
  @ApiBody({ 
    type: UpdateUserDto,
    description: 'User data to update'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'number', example: 1 },
        emails: { type: 'array', items: { type: 'string' }, example: ['newemail@example.com'] },
        walletAddress: { type: 'string', example: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM' },
        isActive: { type: 'boolean', example: true },
        lastLogin: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z', nullable: true },
        currentLinkedCollege: { 
          type: 'object', 
          nullable: true,
          properties: {
            id: { type: 'number', example: 1 },
            name: { type: 'string', example: 'University of California, Los Angeles' },
            commonName: { type: 'string', example: 'UCLA' },
            nickname: { type: 'string', example: 'Bruins' },
            city: { type: 'string', example: 'Los Angeles' },
            state: { type: 'string', example: 'CA' },
            walletAddress: { type: 'string', example: '7xKUo8QzGhzB2vY1NdR9eF5tA3cW8pL6mS4jH9qK1rE2' }
          }
        },
        otpCode: { type: 'string', example: null, nullable: true },
        otpExpiration: { type: 'string', format: 'date-time', example: null, nullable: true },
        createdAt: { type: 'string', format: 'date-time', example: '2025-01-01T00:00:00.000Z' },
        updatedAt: { type: 'string', format: 'date-time', example: '2025-01-15T10:30:00.000Z' }
      },
      nullable: true
    }
  })
  @ApiResponse({ status: 404, description: 'User not found (returns null)' })
  @ApiResponse({ status: 400, description: 'Invalid input data or user ID format' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(+id, updateUserDto);
  }

  @Delete('/delete/:id')
  @ApiOperation({ 
    summary: 'Delete user',
    description: 'Permanently deletes a user from the system. Returns TypeORM DeleteResult with affected count.'
  })
  @ApiParam({ 
    name: 'id', 
    required: true, 
    description: 'User ID',
    type: 'number',
    example: 1
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User deletion result',
    schema: {
      type: 'object',
      properties: {
        affected: { type: 'number', example: 1, description: 'Number of rows affected (0 if user not found, 1 if deleted)' },
        raw: { type: 'object', description: 'Raw database response' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid user ID format' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  remove(@Param('id') id: string) {
    return this.userService.removeUser(+id);
  }
}