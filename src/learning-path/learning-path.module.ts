import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiModule } from '../ai/ai.module.js';
import { LanguagesModule } from '../languages/languages.module.js';
import { TopicVocabulary } from '../topics/entities/topic-vocabulary.entity.js';
import { TopicsModule } from '../topics/topics.module.js';
import { User } from '../users/entities/user.entity.js';
import { VocabularyItem } from '../vocabulary/entities/vocabulary-item.entity.js';
import { VocabularyModule } from '../vocabulary/vocabulary.module.js';
import { LearningPathPart } from './entities/learning-path-part.entity.js';
import { LearningPathTrack } from './entities/learning-path-track.entity.js';
import { LearningPathUnit } from './entities/learning-path-unit.entity.js';
import { UserUnitProgress } from './entities/user-unit-progress.entity.js';
import { LearningPathAiService } from './learning-path-ai.service.js';
import { LearningPathCatalogService } from './learning-path-catalog.service.js';
import { LearningPathController } from './learning-path.controller.js';
import { LearningPathService } from './learning-path.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      LearningPathTrack,
      LearningPathPart,
      LearningPathUnit,
      UserUnitProgress,
      VocabularyItem,
      TopicVocabulary,
    ]),
    AiModule,
    LanguagesModule,
    TopicsModule,
    VocabularyModule,
  ],
  controllers: [LearningPathController],
  providers: [
    LearningPathCatalogService,
    LearningPathAiService,
    LearningPathService,
  ],
  exports: [LearningPathService],
})
export class LearningPathModule {}
