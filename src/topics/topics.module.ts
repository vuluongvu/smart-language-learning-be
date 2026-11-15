import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesModule } from '../languages/languages.module.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { TopicVocabulary } from './entities/topic-vocabulary.entity.js';
import { Topic } from './entities/topic.entity.js';
import { TopicsController } from './topics.controller.js';
import { TopicsService } from './topics.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, TopicVocabulary, VocabularyItem]),
    LanguagesModule,
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
