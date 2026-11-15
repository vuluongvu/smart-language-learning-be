import 'reflect-metadata';
import {
  formatDateInTimezone,
  addCalendarDays,
} from '../common/utils/timezone.util.js';
import { hashPassword } from '../common/utils/hash.util.js';
import {
  FlashcardSessionStatus,
  VocabularyProgressStatus,
  ReviewRating,
} from '../flashcards/entities/flashcard.enums.js';
import { FlashcardReviewSession } from '../flashcards/entities/flashcard-review-session.entity.js';
import { VocabularyProgress } from '../flashcards/entities/vocabulary-progress.entity.js';
import { Language } from '../languages/entities/language.entity.js';
import { QuestionOption } from '../quizzes/entities/question-option.entity.js';
import { QuizQuestion } from '../quizzes/entities/quiz-question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import {
  QuestionType,
  QuizDifficulty,
  QuizStatus,
} from '../quizzes/entities/quiz.enums.js';
import { UserDailyActivity } from '../streaks/entities/user-daily-activity.entity.js';
import { UserStreak } from '../streaks/entities/user-streak.entity.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { User } from '../users/entities/user.entity.js';
import {
  VocabularyItem,
  VocabularySource,
} from '../vocabulary/entities/vocabulary-item.entity.js';
import { AppDataSource } from './data-source.js';

async function seedDevelopmentData(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed demo data when NODE_ENV=production');
  }

  await AppDataSource.initialize();

  try {
    await AppDataSource.transaction(async (manager) => {
      const langRepo = manager.getRepository(Language);
      let english = await langRepo.findOne({ where: { code: 'en' } });
      if (!english) {
        english = await langRepo.save(
          langRepo.create({ code: 'en', name: 'English', isActive: true }),
        );
      }

      const userRepo = manager.getRepository(User);
      const demoEmail = 'demo@openquiz.local';
      const existingDemo = await userRepo.findOne({
        where: { email: demoEmail },
      });
      if (existingDemo) {
        console.log(
          'Development demo dataset already exists — skipping duplicate seed.',
        );
        return;
      }

      const demoPasswordHash = await hashPassword('DemoPassword123!');
      const demoUser = await userRepo.save(
        userRepo.create({
          email: demoEmail,
          passwordHash: demoPasswordHash,
          displayName: 'Demo Learner',
          timezone: 'Asia/Ho_Chi_Minh',
          isLeaderboardVisible: true,
        }),
      );

      const peerEmail = 'peer.alex@openquiz.local';
      let peerUser = await userRepo.findOne({ where: { email: peerEmail } });
      if (!peerUser) {
        peerUser = await userRepo.save(
          userRepo.create({
            email: peerEmail,
            passwordHash: demoPasswordHash,
            displayName: 'Alex Mentor',
            timezone: 'UTC',
            isLeaderboardVisible: true,
          }),
        );
      }

      const topicRepo = manager.getRepository(Topic);
      const topicComm = await topicRepo.save(
        topicRepo.create({
          userId: demoUser.id,
          languageId: english.id,
          name: 'Daily Communication',
          description:
            'High-frequency English verbs and expressions for everyday conversations.',
        }),
      );
      const topicWork = await topicRepo.save(
        topicRepo.create({
          userId: demoUser.id,
          languageId: english.id,
          name: 'Workplace & Interviews',
          description:
            'Core vocabulary for engineering standups, planning, and collaboration.',
        }),
      );

      const vocabRepo = manager.getRepository(VocabularyItem);
      const seedWords = [
        {
          term: 'articulate',
          pronunciation: '/ɑːrˈtɪk.jə.lət/',
          partOfSpeech: 'verb',
          definition: 'express an idea or feeling fluently and clearly',
          example:
            'She articulated the trade-offs clearly during design review.',
          topics: [topicComm.id, topicWork.id],
        },
        {
          term: 'pragmatic',
          pronunciation: '/præɡˈmæt.ɪk/',
          partOfSpeech: 'adjective',
          definition: 'dealing with things sensibly and realistically',
          example: 'We took a pragmatic approach to ship the MVP on schedule.',
          topics: [topicWork.id],
        },
        {
          term: 'concise',
          pronunciation: '/kənˈsaɪs/',
          partOfSpeech: 'adjective',
          definition: 'giving clear information in few words',
          example: 'Keep status updates concise for the morning standup.',
          topics: [topicComm.id, topicWork.id],
        },
        {
          term: 'mitigate',
          pronunciation: '/ˈmɪt.ɪ.ɡeɪt/',
          partOfSpeech: 'verb',
          definition: 'make something less severe, harmful, or painful',
          example: 'Automated tests mitigate regression risks before release.',
          topics: [topicWork.id],
        },
        {
          term: 'resilient',
          pronunciation: '/rɪˈzɪl.jənt/',
          partOfSpeech: 'adjective',
          definition: 'able to recover quickly from difficult conditions',
          example: 'Daily practice builds resilient language recall.',
          topics: [topicComm.id],
        },
        {
          term: 'clarify',
          pronunciation: '/ˈklær.ə.faɪ/',
          partOfSpeech: 'verb',
          definition:
            'make a statement or situation less confused and more understandable',
          example: 'Could you clarify the acceptance criteria before we start?',
          topics: [topicComm.id],
        },
      ];

      const savedVocab: VocabularyItem[] = [];
      const tvRepo = manager.getRepository(TopicVocabulary);
      for (const word of seedWords) {
        const item = await vocabRepo.save(
          vocabRepo.create({
            userId: demoUser.id,
            languageId: english.id,
            term: word.term,
            pronunciation: word.pronunciation,
            partOfSpeech: word.partOfSpeech,
            definition: word.definition,
            example: word.example,
            source: VocabularySource.MANUAL,
          }),
        );
        savedVocab.push(item);

        for (const tid of word.topics) {
          await tvRepo.save(
            tvRepo.create({ topicId: tid, vocabularyId: item.id }),
          );
        }
      }

      // Seed SRS card states (mix of mastered, learning/hard, and new due cards)
      const progressRepo = manager.getRepository(VocabularyProgress);
      const now = new Date();
      await progressRepo.save([
        progressRepo.create({
          userId: demoUser.id,
          vocabularyId: savedVocab[0].id,
          repetitions: 4,
          intervalDays: 21,
          easeFactor: '2.60',
          lastRating: ReviewRating.EASY,
          lastReviewedAt: now,
          nextReviewAt: new Date(now.getTime() + 21 * 86_400_000),
          status: VocabularyProgressStatus.MASTERED,
        }),
        progressRepo.create({
          userId: demoUser.id,
          vocabularyId: savedVocab[1].id,
          repetitions: 1,
          intervalDays: 1,
          easeFactor: '2.36',
          lastRating: ReviewRating.HARD,
          lastReviewedAt: now,
          nextReviewAt: new Date(now.getTime() - 3_600_000),
          status: VocabularyProgressStatus.LEARNING,
        }),
      ]);

      // Seed 1 published quiz covering all 3 question formats
      const quizRepo = manager.getRepository(Quiz);
      const questionRepo = manager.getRepository(QuizQuestion);
      const optionRepo = manager.getRepository(QuestionOption);

      const quiz = await quizRepo.save(
        quizRepo.create({
          userId: demoUser.id,
          topicId: topicWork.id,
          title: 'Workplace Readiness Drill',
          description:
            'Practice realistic vocabulary usage across all three OpenQuiz question formats.',
          difficulty: QuizDifficulty.MEDIUM,
          status: QuizStatus.PUBLISHED,
        }),
      );

      const q1 = await questionRepo.save(
        questionRepo.create({
          quizId: quiz.id,
          vocabularyId: savedVocab[1].id,
          vocabularyTerm: savedVocab[1].term,
          questionText:
            'Which word describes dealing with challenges sensibly and realistically?',
          questionType: QuestionType.MULTIPLE_CHOICE,
          explanation:
            'Pragmatic emphasizes practical solutions over abstract theory.',
          orderIndex: 0,
        }),
      );
      await optionRepo.save([
        optionRepo.create({
          questionId: q1.id,
          optionText: 'pragmatic',
          isCorrect: true,
          orderIndex: 0,
        }),
        optionRepo.create({
          questionId: q1.id,
          optionText: 'erratic',
          isCorrect: false,
          orderIndex: 1,
        }),
        optionRepo.create({
          questionId: q1.id,
          optionText: 'redundant',
          isCorrect: false,
          orderIndex: 2,
        }),
      ]);

      const q2 = await questionRepo.save(
        questionRepo.create({
          quizId: quiz.id,
          vocabularyId: savedVocab[2].id,
          vocabularyTerm: savedVocab[2].term,
          questionText: 'Select the best definition of "concise"',
          questionType: QuestionType.WORD_MEANING,
          explanation:
            'Concise communication avoids filler and gets straight to the point.',
          orderIndex: 1,
        }),
      );
      await optionRepo.save([
        optionRepo.create({
          questionId: q2.id,
          optionText: 'giving clear information in few words',
          isCorrect: true,
          orderIndex: 0,
        }),
        optionRepo.create({
          questionId: q2.id,
          optionText: 'causing unnecessary delay',
          isCorrect: false,
          orderIndex: 1,
        }),
      ]);

      const q3 = await questionRepo.save(
        questionRepo.create({
          quizId: quiz.id,
          vocabularyId: savedVocab[3].id,
          vocabularyTerm: savedVocab[3].term,
          questionText:
            'Regression tests help _____ unexpected release failures.',
          questionType: QuestionType.FILL_BLANK,
          explanation: 'Mitigate means to reduce severity or risk.',
          orderIndex: 2,
        }),
      );
      await optionRepo.save([
        optionRepo.create({
          questionId: q3.id,
          optionText: 'mitigate',
          isCorrect: true,
          orderIndex: 0,
        }),
      ]);

      // Seed 1 completed eligible flashcard session & 2-day streak in Asia/Ho_Chi_Minh
      const todayVn = formatDateInTimezone(now, demoUser.timezone);
      const yesterdayVn = addCalendarDays(todayVn, -1);

      const sessionRepo = manager.getRepository(FlashcardReviewSession);
      await sessionRepo.save(
        sessionRepo.create({
          userId: demoUser.id,
          topicId: topicComm.id,
          cardIds: savedVocab.slice(0, 5).map((v) => v.id),
          targetCount: 5,
          reviewedCount: 5,
          isStreakEligible: true,
          status: FlashcardSessionStatus.COMPLETED,
          completedAt: now,
        }),
      );

      const dailyRepo = manager.getRepository(UserDailyActivity);
      await dailyRepo.save([
        dailyRepo.create({
          userId: demoUser.id,
          activityDate: yesterdayVn,
          activityCount: 1,
          quizCompletions: 1,
          flashcardCompletions: 0,
        }),
        dailyRepo.create({
          userId: demoUser.id,
          activityDate: todayVn,
          activityCount: 1,
          quizCompletions: 0,
          flashcardCompletions: 1,
        }),
      ]);

      const streakRepo = manager.getRepository(UserStreak);
      const todayUtc = formatDateInTimezone(now, peerUser.timezone);
      await streakRepo.save([
        streakRepo.create({
          userId: demoUser.id,
          currentStreak: 2,
          longestStreak: 2,
          lastActivityDate: todayVn,
          currentStreakStartedAt: yesterdayVn,
          streakAchievedAt: now,
        }),
        streakRepo.create({
          userId: peerUser.id,
          currentStreak: 5,
          longestStreak: 5,
          lastActivityDate: todayUtc,
          currentStreakStartedAt: addCalendarDays(todayUtc, -4),
          streakAchievedAt: new Date(now.getTime() - 3_600_000),
        }),
      ]);

      console.log(
        `Seeded OpenQuiz dev dataset successfully (demo login: ${demoEmail} / DemoPassword123!).`,
      );
    });
  } finally {
    await AppDataSource.destroy();
  }
}

void seedDevelopmentData();
