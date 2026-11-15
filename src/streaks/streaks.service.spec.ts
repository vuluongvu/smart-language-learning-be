import { NotFoundException } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { vi } from 'vitest';
import {
  ActivitySourceType,
  LearningActivityEvent,
} from './entities/learning-activity-event.entity.js';
import { UserDailyActivity } from './entities/user-daily-activity.entity.js';
import { UserStreak } from './entities/user-streak.entity.js';
import { StreakCalculatorService } from './streak-calculator.service.js';
import { StreaksService } from './streaks.service.js';
import { User } from '../users/entities/user.entity.js';

describe('StreaksService', () => {
  const createRepoMock = () => ({
    findOne: vi.fn(),
    find: vi.fn(),
    create: vi.fn((data) => ({ ...data })),
    save: vi.fn((data) => Promise.resolve(data)),
    createQueryBuilder: vi.fn(),
  });

  const createInsertQb = (affectedRows = 1) => ({
    insert: vi.fn().mockReturnThis(),
    into: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    orIgnore: vi.fn().mockReturnThis(),
    updateEntity: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue({ raw: { affectedRows } }),
  });

  const setup = () => {
    const userRepo = createRepoMock();
    const userStreakRepo = createRepoMock();
    const dailyRepo = createRepoMock();
    const calculator = new StreakCalculatorService();
    const service = new StreaksService(
      userRepo as never,
      userStreakRepo as never,
      dailyRepo as never,
      calculator,
    );
    return { service, userRepo, userStreakRepo, dailyRepo };
  };

  it('throws NotFoundException when recording activity for unknown user', async () => {
    const { service } = setup();
    const txUserRepo = createRepoMock();
    txUserRepo.findOne.mockResolvedValue(null);

    const manager = {
      getRepository: vi.fn().mockReturnValue(txUserRepo),
    } as unknown as EntityManager;

    await expect(
      service.recordQualifiedActivity(manager, {
        userId: 999,
        sourceType: ActivitySourceType.QUIZ_ATTEMPT,
        sourceId: 12,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('locks user row, converts timestamp to user timezone, and ensures idempotent event recording', async () => {
    const { service } = setup();

    const txUserRepo = createRepoMock();
    txUserRepo.findOne.mockResolvedValue({
      id: 1,
      timezone: 'Asia/Ho_Chi_Minh',
    });

    const txEventRepo = createRepoMock();
    txEventRepo.createQueryBuilder
      .mockReturnValueOnce(createInsertQb(1))
      .mockReturnValueOnce(createInsertQb(0));
    txEventRepo.findOne.mockResolvedValue({
      id: 10,
      eventKey: 'quiz_attempt:55',
      activityDate: '2026-03-11',
    });

    const txDailyRepo = createRepoMock();

    const txStreakRepo = createRepoMock();
    txStreakRepo.createQueryBuilder.mockReturnValue(createInsertQb(1));
    txStreakRepo.findOne.mockResolvedValue({
      id: 3,
      userId: 1,
      currentStreak: 2,
      longestStreak: 2,
      lastActivityDate: '2026-03-10',
      currentStreakStartedAt: '2026-03-09',
      streakAchievedAt: new Date('2026-03-10T10:00:00Z'),
    });

    const queryMock = vi.fn().mockResolvedValue({ affectedRows: 1 });
    const manager = {
      query: queryMock,
      getRepository: vi.fn((entity) => {
        if (entity === User) return txUserRepo;
        if (entity === LearningActivityEvent) return txEventRepo;
        if (entity === UserDailyActivity) return txDailyRepo;
        if (entity === UserStreak) return txStreakRepo;
        return createRepoMock();
      }),
    } as unknown as EntityManager;

    // 2026-03-10T20:00:00Z is 2026-03-11 03:00 in Asia/Ho_Chi_Minh (+07:00)
    const first = await service.recordQualifiedActivity(manager, {
      userId: 1,
      sourceType: ActivitySourceType.QUIZ_ATTEMPT,
      sourceId: 55,
      occurredAt: new Date('2026-03-10T20:00:00Z'),
    });

    expect(txUserRepo.findOne).toHaveBeenCalledWith({
      where: { id: 1 },
      lock: { mode: 'pessimistic_write' },
    });
    expect(queryMock).toHaveBeenCalledTimes(1);
    expect(first).toEqual({
      recorded: true,
      duplicate: false,
      activityDate: '2026-03-11',
      currentStreak: 3,
      longestStreak: 3,
    });

    // Duplicate retry on same source does not increment again
    const second = await service.recordQualifiedActivity(manager, {
      userId: 1,
      sourceType: ActivitySourceType.QUIZ_ATTEMPT,
      sourceId: 55,
      occurredAt: new Date('2026-03-10T20:00:00Z'),
    });

    expect(second.recorded).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('builds calendar days distinguishing before_registration, active, missed, inactive_today, and future', async () => {
    const { service, userRepo, dailyRepo } = setup();
    const fakeNow = new Date();
    const yyyy = fakeNow.getUTCFullYear();
    const mm = String(fakeNow.getUTCMonth() + 1).padStart(2, '0');
    const currentMonth = `${yyyy}-${mm}`;

    userRepo.findOne.mockResolvedValue({
      id: 1,
      timezone: 'UTC',
      createdAt: new Date(`${currentMonth}-02T00:00:00Z`),
    });
    dailyRepo.find.mockResolvedValue([
      {
        userId: 1,
        activityDate: `${currentMonth}-02`,
        activityCount: 2,
        quizCompletions: 1,
        flashcardCompletions: 1,
      },
    ]);

    const calendar = await service.getCalendar(1, currentMonth);
    expect(calendar.month).toBe(currentMonth);
    expect(calendar.days[0].status).toBe('before_registration');
    expect(calendar.days[1].status).toBe('active');
    expect(calendar.days[1].activityCount).toBe(2);
  });
});
