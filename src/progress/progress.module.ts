import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FlashcardReviewSession } from '../flashcards/entities/flashcard-review-session.entity.js';
import { VocabularyProgress } from '../flashcards/entities/vocabulary-progress.entity.js';
import { LanguagesModule } from '../languages/languages.module.js';
import { QuizAnswer } from '../quizzes/entities/quiz-answer.entity.js';
import { QuizAttempt } from '../quizzes/entities/quiz-attempt.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { StreaksModule } from '../streaks/streaks.module.js';
import { UserDailyActivity } from '../streaks/entities/user-daily-activity.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { ProgressController } from './progress.controller.js';
import { ProgressService } from './progress.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VocabularyItem,
      VocabularyProgress,
      Topic,
      Quiz,
      QuizAttempt,
      QuizAnswer,
      FlashcardReviewSession,
      UserDailyActivity,
    ]),
    LanguagesModule,
    StreaksModule,
  ],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
