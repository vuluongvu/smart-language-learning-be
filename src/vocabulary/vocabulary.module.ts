import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module.js';
import { VocabularyProgress } from '../flashcards/entities/vocabulary-progress.entity.js';
import { LanguagesModule } from '../languages/languages.module.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsModule } from '../topics/topics.module.js';
import { VocabularyItem } from './entities/vocabulary-item.entity.js';
import { VocabularyAiService } from './vocabulary-ai.service.js';
import { VocabularyController } from './vocabulary.controller.js';
import { VocabularyService } from './vocabulary.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VocabularyItem,
      TopicVocabulary,
      VocabularyProgress,
    ]),
    AiModule,
    LanguagesModule,
    TopicsModule,
  ],
  controllers: [VocabularyController],
  providers: [VocabularyService, VocabularyAiService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
