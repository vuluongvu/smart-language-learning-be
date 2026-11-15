import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { LearningActivityEvent } from './entities/learning-activity-event.entity.js';
import { UserDailyActivity } from './entities/user-daily-activity.entity.js';
import { UserStreak } from './entities/user-streak.entity.js';
import { StreakCalculatorService } from './streak-calculator.service.js';
import { StreaksController } from './streaks.controller.js';
import { StreaksService } from './streaks.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      UserStreak,
      UserDailyActivity,
      LearningActivityEvent,
    ]),
  ],
  controllers: [StreaksController],
  providers: [StreakCalculatorService, StreaksService],
  exports: [StreakCalculatorService, StreaksService, TypeOrmModule],
})
export class StreaksModule {}
