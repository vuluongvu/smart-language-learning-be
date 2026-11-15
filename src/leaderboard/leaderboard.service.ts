import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type {
  PaginationMeta,
  PaginationQueryDto,
} from '../common/dto/pagination-query.dto.js';
import {
  formatDateInTimezone,
  normalizeDateOnly,
  resolveSafeTimezone,
} from '../common/utils/timezone.util.js';
import { UserStreak } from '../streaks/entities/user-streak.entity.js';
import { StreakCalculatorService } from '../streaks/streak-calculator.service.js';
import { User } from '../users/entities/user.entity.js';

export interface LeaderboardEntryDto {
  rank: number;
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  currentStreak: number;
  longestStreak: number;
  isCurrentUser: boolean;
}

export interface LeaderboardMyPositionDto {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  isLeaderboardVisible: boolean;
  rank: number | null;
  currentStreak: number;
  longestStreak: number;
  totalParticipants: number;
}

export interface StreakLeaderboardResponseDto {
  items: LeaderboardEntryDto[];
  meta: PaginationMeta;
  myPosition: LeaderboardMyPositionDto;
}

interface RankedParticipant {
  userId: number;
  displayName: string;
  avatarUrl: string | null;
  currentStreak: number;
  longestStreak: number;
  streakAchievedAt: Date | null;
}

function compareAchievedAtAsc(a: Date | null, b: Date | null): number {
  if (a && b) {
    return a.getTime() - b.getTime();
  }
  if (a && !b) {
    return -1;
  }
  if (!a && b) {
    return 1;
  }
  return 0;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserStreak)
    private readonly userStreakRepository: Repository<UserStreak>,
    private readonly calculator: StreakCalculatorService,
  ) {}

  async getStreakLeaderboard(
    currentUserId: number,
    query: PaginationQueryDto,
  ): Promise<StreakLeaderboardResponseDto> {
    const caller = await this.userRepository.findOne({
      where: { id: currentUserId },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        timezone: true,
        isLeaderboardVisible: true,
      },
    });
    if (!caller) {
      throw new NotFoundException('User not found');
    }

    const visibleUsers = await this.userRepository.find({
      where: { isLeaderboardVisible: true },
      select: {
        id: true,
        displayName: true,
        avatarUrl: true,
        timezone: true,
      },
    });

    const visibleIds = visibleUsers.map((u) => u.id);
    const allIdsToLoad = Array.from(new Set([...visibleIds, currentUserId]));
    const streaks =
      allIdsToLoad.length > 0
        ? await this.userStreakRepository.find({
            where: { userId: In(allIdsToLoad) },
          })
        : [];

    const streakByUserId = new Map<number, UserStreak>();
    for (const streak of streaks) {
      streakByUserId.set(streak.userId, streak);
    }

    const now = new Date();
    const participants: RankedParticipant[] = visibleUsers.map((user) => {
      const streak = streakByUserId.get(user.id) ?? null;
      const todayYmd = formatDateInTimezone(
        now,
        resolveSafeTimezone(user.timezone),
      );
      const effectiveCurrent = this.calculator.computeEffectiveCurrentStreak(
        streak?.currentStreak ?? 0,
        normalizeDateOnly(streak?.lastActivityDate ?? null),
        todayYmd,
      );
      const longestStreak = Math.max(
        streak?.longestStreak ?? 0,
        effectiveCurrent,
      );
      return {
        userId: user.id,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? null,
        currentStreak: effectiveCurrent,
        longestStreak,
        streakAchievedAt: streak?.streakAchievedAt ?? null,
      };
    });

    participants.sort((a, b) => {
      if (b.currentStreak !== a.currentStreak) {
        return b.currentStreak - a.currentStreak;
      }
      if (b.longestStreak !== a.longestStreak) {
        return b.longestStreak - a.longestStreak;
      }
      const achievedCmp = compareAchievedAtAsc(
        a.streakAchievedAt,
        b.streakAchievedAt,
      );
      if (achievedCmp !== 0) {
        return achievedCmp;
      }
      return a.userId - b.userId;
    });

    const total = participants.length;
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;

    const items: LeaderboardEntryDto[] = participants
      .slice(offset, offset + limit)
      .map((entry, idx) => ({
        rank: offset + idx + 1,
        userId: entry.userId,
        displayName: entry.displayName,
        avatarUrl: entry.avatarUrl,
        currentStreak: entry.currentStreak,
        longestStreak: entry.longestStreak,
        isCurrentUser: entry.userId === currentUserId,
      }));

    const callerRankedIndex = participants.findIndex(
      (p) => p.userId === currentUserId,
    );

    let myPosition: LeaderboardMyPositionDto;
    if (caller.isLeaderboardVisible && callerRankedIndex >= 0) {
      const self = participants[callerRankedIndex];
      myPosition = {
        userId: caller.id,
        displayName: caller.displayName,
        avatarUrl: caller.avatarUrl ?? null,
        isLeaderboardVisible: true,
        rank: callerRankedIndex + 1,
        currentStreak: self.currentStreak,
        longestStreak: self.longestStreak,
        totalParticipants: total,
      };
    } else {
      const callerStreak = streakByUserId.get(caller.id) ?? null;
      const callerToday = formatDateInTimezone(
        now,
        resolveSafeTimezone(caller.timezone),
      );
      const effectiveCurrent = this.calculator.computeEffectiveCurrentStreak(
        callerStreak?.currentStreak ?? 0,
        normalizeDateOnly(callerStreak?.lastActivityDate ?? null),
        callerToday,
      );
      myPosition = {
        userId: caller.id,
        displayName: caller.displayName,
        avatarUrl: caller.avatarUrl ?? null,
        isLeaderboardVisible: caller.isLeaderboardVisible,
        rank: null,
        currentStreak: effectiveCurrent,
        longestStreak: Math.max(
          callerStreak?.longestStreak ?? 0,
          effectiveCurrent,
        ),
        totalParticipants: total,
      };
    }

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
      myPosition,
    };
  }
}
