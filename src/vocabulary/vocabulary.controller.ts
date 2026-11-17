import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import {
  AiEnrichVocabularyDto,
  AiGenerateVocabularyDto,
  BulkCreateVocabularyDto,
} from './dto/ai-vocabulary.dto.js';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto.js';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto.js';
import { VocabularyQueryDto } from './dto/vocabulary-query.dto.js';
import { VocabularyAiService } from './vocabulary-ai.service.js';
import { VocabularyService } from './vocabulary.service.js';

@ApiTags('Vocabulary')
@ApiBearerAuth()
@Controller('vocabulary')
export class VocabularyController {
  constructor(
    private readonly vocabularyService: VocabularyService,
    private readonly vocabularyAiService: VocabularyAiService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List, search, filter, and paginate owned vocabulary items',
  })
  findAll(
    @CurrentUser('userId') userId: number,
    @Query() query: VocabularyQueryDto,
  ) {
    return this.vocabularyService.findAll(userId, query);
  }

  @Get('check-duplicate')
  @ApiOperation({
    summary: 'Check whether a term already exists in your vocabulary bank',
  })
  checkDuplicate(
    @CurrentUser('userId') userId: number,
    @Query('term') term = '',
  ) {
    return this.vocabularyService.checkDuplicate(userId, term);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new vocabulary word or phrase' })
  create(
    @CurrentUser('userId') userId: number,
    @Body() dto: CreateVocabularyDto,
  ) {
    return this.vocabularyService.create(userId, dto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple vocabulary items in one batch' })
  createBulk(
    @CurrentUser('userId') userId: number,
    @Body() dto: BulkCreateVocabularyDto,
  ) {
    return this.vocabularyService.createBulk(userId, dto);
  }

  @Post('ai/enrich')
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Auto-fill pronunciation, POS, Vietnamese definition, and example for a term via AI',
  })
  enrichWithAi(
    @CurrentUser('userId') userId: number,
    @Body() dto: AiEnrichVocabularyDto,
  ) {
    return this.vocabularyAiService.enrichTerm(userId, dto);
  }

  @Post('ai/generate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Generate draft vocabulary cards from a topic prompt or English passage via AI',
  })
  generateWithAi(
    @CurrentUser('userId') userId: number,
    @Body() dto: AiGenerateVocabularyDto,
  ) {
    return this.vocabularyAiService.generateBatch(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a single vocabulary item' })
  findOne(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vocabularyService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned vocabulary item' })
  update(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVocabularyDto,
  ) {
    return this.vocabularyService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an owned vocabulary item' })
  remove(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.vocabularyService.remove(userId, id);
  }
}
