import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { ProgressHistoryQueryDto } from './dto/progress-history-query.dto.js';
import { ProgressService } from './progress.service.js';

@ApiTags('Progress & Analytics')
@ApiBearerAuth()
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('overview')
  @ApiOperation({
    summary:
      'Get real learner progress metrics, active streak summary, weak words, and recent quiz attempts',
  })
  getOverview(@CurrentUser('userId') userId: number) {
    return this.progressService.getOverview(userId);
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get daily learning activity series and study history',
  })
  getHistory(
    @CurrentUser('userId') userId: number,
    @Query() query: ProgressHistoryQueryDto,
  ) {
    return this.progressService.getHistory(userId, query);
  }
}
