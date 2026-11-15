import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesModule } from '../languages/languages.module.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsModule } from '../topics/topics.module.js';
import { VocabularyItem } from './entities/vocabulary-item.entity.js';
import { VocabularyController } from './vocabulary.controller.js';
import { VocabularyService } from './vocabulary.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([VocabularyItem, TopicVocabulary]),
    LanguagesModule,
    TopicsModule,
  ],
  controllers: [VocabularyController],
  providers: [VocabularyService],
  exports: [VocabularyService],
})
export class VocabularyModule {}
