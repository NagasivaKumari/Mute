import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Public } from '../common/decorators/public.decorator';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  check() {
    const dbStatus = this.databaseService.getStatus();

    return {
      success: true,
      data: {
        status: dbStatus === 'connected' ? 'ok' : 'degraded',
        service: 'sentinel-backend',
        database: dbStatus,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('db')
  db() {
    const dbStatus = this.databaseService.getStatus();

    return {
      success: dbStatus === 'connected',
      data: {
        status: dbStatus,
        connected: this.databaseService.isConnected(),
        timestamp: new Date().toISOString(),
      },
    };
  }
}
