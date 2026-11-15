import { NotFoundException } from '@nestjs/common';
import { vi } from 'vitest';
import { formatDateInTimezone } from '../common/utils/timezone.util.js';
import { StreakCalculatorService } from '../streaks/streak-calculator.service.js';
import { LeaderboardService } from './leaderboard.service.js';

describe('LeaderboardService', () => {
  const createRepoMock = () => ({
    findOne: vi.fn(),
    find: vi.fn(),
  });

  const setup = () => {
    const userRepo = createRepoMock();
    const streakRepo = createRepoMock();
    const calculator = new StreakCalculatorService();
    const service = new LeaderboardService(
      userRepo as never,
      streakRepo as never,
      calculator,
    );
    return { service, userRepo, streakRepo };
  };

  it('throws NotFoundException if caller does not exist', async () => {
    const { service, userRepo } = setup();
    userRepo.findOne.mockResolvedValue(null);

    await expect(
      service.getStreakLeaderboard(999, { page: 1, limit: 10 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('excludes opted-out users, applies tie-breakers, and exposes no PII fields', async () => {
    const { service, userRepo, streakRepo } = setup();
    const todayUtc = formatDateInTimezone(new Date(), 'UTC');

    // Caller is opted out
    userRepo.findOne.mockResolvedValue({
      id: 1,
      displayName: 'Hidden User',
      avatarUrl: null,
      timezone: 'UTC',
      isLeaderboardVisible: false,
      email: 'secret@example.com',
    });

    // Public list from find({ where: { isLeaderboardVisible: true } })
    userRepo.find.mockResolvedValue([
      { id: 2, displayName: 'Bob', avatarUrl: null, timezone: 'UTC' },
      {
        id: 3,
        displayName: 'Alice',
        avatarUrl: 'https://img/a.png',
        timezone: 'UTC',
      },
      { id: 4, displayName: 'Charlie', avatarUrl: null, timezone: 'UTC' },
    ]);

    streakRepo.find.mockResolvedValue([
      {
        userId: 1,
        currentStreak: 9,
        longestStreak: 9,
        lastActivityDate: todayUtc,
        streakAchievedAt: new Date('2026-03-01T08:00:00Z'),
      },
      // Tie on currentStreak (5) AND longestStreak (7): Alice achieved earlier than Bob
      {
        userId: 2,
        currentStreak: 5,
        longestStreak: 7,
        lastActivityDate: todayUtc,
        streakAchievedAt: new Date('2026-03-10T12:00:00Z'),
      },
      {
        userId: 3,
        currentStreak: 5,
        longestStreak: 7,
        lastActivityDate: todayUtc,
        streakAchievedAt: new Date('2026-03-10T08:00:00Z'),
      },
      // Charlie has higher longestStreak (10) than current 3 -> still ranks behind active 5
      {
        userId: 4,
        currentStreak: 3,
        longestStreak: 10,
        lastActivityDate: todayUtc,
        streakAchievedAt: new Date('2026-03-09T09:00:00Z'),
      },
    ]);

    const res = await service.getStreakLeaderboard(1, { page: 1, limit: 10 });

    expect(res.items).toHaveLength(3);
    expect(res.items.map((i) => i.displayName)).toEqual([
      'Alice',
      'Bob',
      'Charlie',
    ]);
    expect(res.items.map((i) => i.rank)).toEqual([1, 2, 3]);
    expect(Object.keys(res.items[0]).sort()).toEqual([
      'avatarUrl',
      'currentStreak',
      'displayName',
      'isCurrentUser',
      'longestStreak',
      'rank',
      'userId',
    ]);

    expect(res.myPosition).toEqual({
      userId: 1,
      displayName: 'Hidden User',
      avatarUrl: null,
      isLeaderboardVisible: false,
      rank: null,
      currentStreak: 9,
      longestStreak: 9,
      totalParticipants: 3,
    });
  });

  it('expires stale streaks on leaderboard live calculation', async () => {
    const { service, userRepo, streakRepo } = setup();
    const todayUtc = formatDateInTimezone(new Date(), 'UTC');

    userRepo.findOne.mockResolvedValue({
      id: 1,
      displayName: 'Active Learner',
      avatarUrl: null,
      timezone: 'UTC',
      isLeaderboardVisible: true,
    });
    userRepo.find.mockResolvedValue([
      {
        id: 1,
        displayName: 'Active Learner',
        avatarUrl: null,
        timezone: 'UTC',
      },
      {
        id: 2,
        displayName: 'Lapsed Learner',
        avatarUrl: null,
        timezone: 'UTC',
      },
    ]);
    streakRepo.find.mockResolvedValue([
      {
        userId: 1,
        currentStreak: 2,
        longestStreak: 2,
        lastActivityDate: todayUtc,
        streakAchievedAt: new Date(),
      },
      {
        userId: 2,
        currentStreak: 15,
        longestStreak: 15,
        lastActivityDate: '2020-01-01',
        streakAchievedAt: new Date('2020-01-01T10:00:00Z'),
      },
    ]);

    const res = await service.getStreakLeaderboard(1, { page: 1, limit: 10 });
    expect(res.items[0].displayName).toBe('Active Learner');
    expect(res.items[0].currentStreak).toBe(2);
    expect(res.items[1].displayName).toBe('Lapsed Learner');
    expect(res.items[1].currentStreak).toBe(0);
    expect(res.items[1].longestStreak).toBe(15);
    expect(res.myPosition.rank).toBe(1);
  });
});
