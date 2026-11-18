import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiConversationService } from './ai-conversation.service.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiConversationSession } from './entities/ai-conversation-session.entity.js';
import { AiConversationTurn } from './entities/ai-conversation-turn.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiConversationSession, AiConversationTurn]),
  ],
  controllers: [AiController],
  providers: [AiService, AiConversationService],
  exports: [AiService, AiConversationService],
})
export class AiModule {}
