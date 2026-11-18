import {
  Controller,
  Get,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly appService: AppService,
    @Optional() private readonly dataSource?: DataSource,
  ) {}

  @Public() // mark this route as public
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Public()
  @Get('health')
  async getHealth() {
    const timestamp = new Date().toISOString();
    let database: 'up' | 'skipped' = 'skipped';

    if (this.dataSource?.isInitialized) {
      try {
        await this.dataSource.query('SELECT 1');
        database = 'up';
      } catch (error) {
        this.logger.error(
          `Database health check failed: ${(error as Error).message}`,
        );
        throw new ServiceUnavailableException({
          status: 'error',
          database: 'down',
          timestamp,
        });
      }
    }

    return {
      status: 'ok',
      database,
      timestamp,
    };
  }
}
