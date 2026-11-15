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
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { CreateVocabularyDto } from './dto/create-vocabulary.dto.js';
import { UpdateVocabularyDto } from './dto/update-vocabulary.dto.js';
import { VocabularyQueryDto } from './dto/vocabulary-query.dto.js';
import { VocabularyService } from './vocabulary.service.js';

@ApiTags('Vocabulary')
@ApiBearerAuth()
@Controller('vocabulary')
export class VocabularyController {
  constructor(private readonly vocabularyService: VocabularyService) {}

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
