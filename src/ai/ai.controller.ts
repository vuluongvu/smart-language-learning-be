import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  type LearningLanguageCode,
  normalizeLearningLanguage,
} from '../common/constants/learning-languages.js';
import { type UploadedImageInput } from '../common/utils/image-upload.util.js';
import { AiConversationService } from './ai-conversation.service.js';
import {
  AiHandwritingService,
  MAX_HANDWRITING_IMAGE_BYTES,
} from './ai-handwriting.service.js';
import { AiMessage, AiService, type UploadedAudioInput } from './ai.service.js';
import { ChatDto } from './dto/chat.dto.js';
import {
  ListConversationsQueryDto,
  ReplyConversationDto,
  StartConversationDto,
} from './dto/conversation.dto.js';
import { RecognizeHandwritingDto } from './dto/handwriting.dto.js';

const ENGLISH_TUTOR_SYSTEM_PROMPT =
  'You are a friendly English tutor in a language-learning app. ' +
  'Explain vocabulary, grammar and usage clearly and concisely, ' +
  'give short examples, and correct mistakes politely.';

const KOREAN_TUTOR_SYSTEM_PROMPT =
  'You are a friendly Korean language tutor in a language-learning app. ' +
  'Explain Hangul vocabulary, Korean grammar (particles, verb conjugations, honorifics), and natural usage clearly and concisely. ' +
  'Include Hangul examples with pronunciation/Romanization hints when helpful, and correct learner mistakes politely.';

function getTutorPrompt(lang: LearningLanguageCode): string {
  return lang === 'ko'
    ? KOREAN_TUTOR_SYSTEM_PROMPT
    : ENGLISH_TUTOR_SYSTEM_PROMPT;
}

const MAX_CHAT_HISTORY_MESSAGES = 10;
const MAX_CHAT_HISTORY_CHARS = 800;

@ApiTags('AI')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly conversationService: AiConversationService,
    private readonly handwritingService: AiHandwritingService,
  ) {}

  @Get('status')
  @ApiOperation({ summary: 'Check whether the AI provider is enabled' })
  status() {
    return { enabled: this.aiService.isEnabled(), model: this.aiService.model };
  }

  @Post('chat')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Chat with the AI language tutor (en or ko)' })
  chat(@Body() dto: ChatDto) {
    const compactHistory: AiMessage[] = (dto.history ?? [])
      .slice(-MAX_CHAT_HISTORY_MESSAGES)
      .map((item) => ({
        role: item.role,
        content: item.content.slice(0, MAX_CHAT_HISTORY_CHARS),
      }));

    const lang = normalizeLearningLanguage(dto.languageCode);
    const messages: AiMessage[] = [
      { role: 'system', content: getTutorPrompt(lang) },
      ...compactHistory,
      { role: 'user', content: dto.message },
    ];
    return this.aiService.chat(messages, { temperature: dto.temperature });
  }

  @Post('transcribe')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Transcribe spoken audio (en/ko) via Groq Whisper' })
  transcribe(
    @UploadedFile() file?: UploadedAudioInput,
    @Body('language') language?: string,
    @Body('prompt') prompt?: string,
  ) {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Audio file is required');
    }
    const mime = (file.mimetype || '').toLowerCase();
    if (
      mime &&
      !mime.startsWith('audio/') &&
      mime !== 'video/webm' &&
      mime !== 'application/octet-stream'
    ) {
      throw new BadRequestException('Unsupported audio format');
    }
    const normalizedLang = normalizeLearningLanguage(language);
    return this.aiService.transcribeAudio(file, {
      language: normalizedLang,
      prompt,
    });
  }

  @Get('conversations')
  @ApiOperation({ summary: 'List guided conversation practice sessions' })
  listConversations(
    @CurrentUser('userId') userId: number,
    @Query() query: ListConversationsQueryDto,
  ) {
    return this.conversationService.listSessions(userId, query.languageCode);
  }

  @Post('conversations')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Start a guided conversation practice session with an opening question',
  })
  startConversation(
    @CurrentUser('userId') userId: number,
    @Body() dto: StartConversationDto,
  ) {
    return this.conversationService.startSession(userId, dto);
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get a guided conversation session and its turns' })
  getConversation(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.conversationService.getSessionDetail(userId, id);
  }

  @Post('conversations/:id/reply')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Submit an English reply, receive detailed AI feedback, and get the connected follow-up question',
  })
  replyConversation(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyConversationDto,
  ) {
    return this.conversationService.replyToTurn(userId, id, dto);
  }

  @Post('conversations/:id/end')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'End a guided conversation session and generate a learning summary',
  })
  endConversation(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.conversationService.endSession(userId, id);
  }

  @Post('handwriting/recognize')
  @Throttle({ default: { limit: 25, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: MAX_HANDWRITING_IMAGE_BYTES },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Recognize or evaluate handwritten Korean Hangul from a canvas image via AI vision',
  })
  recognizeHandwriting(
    @UploadedFile() image: UploadedImageInput | undefined,
    @Body() dto: RecognizeHandwritingDto,
  ) {
    return this.handwritingService.recognizeHandwriting(image, dto);
  }
}
