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
import { CreateTopicDto } from './dto/create-topic.dto.js';
import { TopicQueryDto } from './dto/topic-query.dto.js';
import { UpdateTopicDto } from './dto/update-topic.dto.js';
import { TopicsService } from './topics.service.js';

@ApiTags('Topics')
@ApiBearerAuth()
@Controller('topics')
export class TopicsController {
  constructor(private readonly topicsService: TopicsService) {}

  @Get()
  @ApiOperation({ summary: 'List topics owned by current learner' })
  findAll(
    @CurrentUser('userId') userId: number,
    @Query() query: TopicQueryDto,
  ) {
    return this.topicsService.findAll(userId, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new learning topic (en or ko)' })
  create(@CurrentUser('userId') userId: number, @Body() dto: CreateTopicDto) {
    return this.topicsService.create(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get topic detail and attached vocabulary items' })
  findOne(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.topicsService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an owned topic' })
  update(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTopicDto,
  ) {
    return this.topicsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete an owned topic without deleting shared vocabulary items',
  })
  remove(
    @CurrentUser('userId') userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.topicsService.remove(userId, id);
  }

  @Post(':topicId/vocabulary/:vocabularyId')
  @ApiOperation({ summary: 'Attach a vocabulary item to a topic' })
  attachVocabulary(
    @CurrentUser('userId') userId: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('vocabularyId', ParseIntPipe) vocabularyId: number,
  ) {
    return this.topicsService.attachVocabulary(userId, topicId, vocabularyId);
  }

  @Delete(':topicId/vocabulary/:vocabularyId')
  @ApiOperation({
    summary: 'Remove a vocabulary item from a topic without deleting it',
  })
  detachVocabulary(
    @CurrentUser('userId') userId: number,
    @Param('topicId', ParseIntPipe) topicId: number,
    @Param('vocabularyId', ParseIntPipe) vocabularyId: number,
  ) {
    return this.topicsService.detachVocabulary(userId, topicId, vocabularyId);
  }
}
