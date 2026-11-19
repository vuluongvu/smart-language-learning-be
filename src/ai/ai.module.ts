import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiConversationService } from './ai-conversation.service.js';
import { AiHandwritingService } from './ai-handwriting.service.js';
import { AiStarterGrammarService } from './ai-starter-grammar.service.js';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { AiConversationSession } from './entities/ai-conversation-session.entity.js';
import { AiConversationTurn } from './entities/ai-conversation-turn.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiConversationSession, AiConversationTurn]),
  ],
  controllers: [AiController],
  providers: [
    AiService,
    AiConversationService,
    AiHandwritingService,
    AiStarterGrammarService,
  ],
  exports: [
    AiService,
    AiConversationService,
    AiHandwritingService,
    AiStarterGrammarService,
  ],
})
export class AiModule {}
