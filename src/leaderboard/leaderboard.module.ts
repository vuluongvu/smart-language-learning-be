import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreaksModule } from '../streaks/streaks.module.js';
import { UserStreak } from '../streaks/entities/user-streak.entity.js';
import { User } from '../users/entities/user.entity.js';
import { LeaderboardController } from './leaderboard.controller.js';
import { LeaderboardService } from './leaderboard.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserStreak]), StreaksModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
