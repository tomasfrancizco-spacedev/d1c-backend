import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealthCheck() {
    return {
      status: 'OK',
      message: 'D1C Backend is healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
