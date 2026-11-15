import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { Topic } from '../topics/entities/topic.entity.js';
import { TopicsModule } from '../topics/topics.module.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyModule } from '../vocabulary/vocabulary.module.js';
import { FlashcardReviewSession } from './entities/flashcard-review-session.entity.js';
import { FlashcardReview } from './entities/flashcard-review.entity.js';
import { VocabularyProgress } from './entities/vocabulary-progress.entity.js';
import { FlashcardsController } from './flashcards.controller.js';
import { FlashcardsService } from './flashcards.service.js';
import { ReviewSchedulerService } from './review-scheduler.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VocabularyProgress,
      FlashcardReviewSession,
      FlashcardReview,
      VocabularyItem,
      Topic,
      TopicVocabulary,
    ]),
    TopicsModule,
    VocabularyModule,
  ],
  controllers: [FlashcardsController],
  providers: [FlashcardsService, ReviewSchedulerService],
  exports: [FlashcardsService, ReviewSchedulerService],
})
export class FlashcardsModule {}
