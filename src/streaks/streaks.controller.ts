import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StreakCalendarQueryDto } from './dto/streak-calendar-query.dto.js';
import { StreaksService } from './streaks.service.js';

@ApiTags('Streaks')
@ApiBearerAuth()
@Controller('streaks')
export class StreaksController {
  constructor(private readonly streaksService: StreaksService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current learner active streak summary and today status',
  })
  getMyStreak(@CurrentUser('userId') userId: number) {
    return this.streaksService.getMyStreak(userId);
  }

  @Get('calendar')
  @ApiOperation({
    summary: 'Get monthly streak calendar grid with active and missed days',
  })
  getCalendar(
    @CurrentUser('userId') userId: number,
    @Query() query: StreakCalendarQueryDto,
  ) {
    return this.streaksService.getCalendar(userId, query.month);
  }
}
