import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { LeaderboardService } from './leaderboard.service.js';

@ApiTags('Leaderboard')
@ApiBearerAuth()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('streaks')
  @ApiOperation({
    summary: 'Get privacy-aware public streak leaderboard with caller position',
  })
  getStreakLeaderboard(
    @CurrentUser('userId') userId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.leaderboardService.getStreakLeaderboard(userId, query);
  }
}
