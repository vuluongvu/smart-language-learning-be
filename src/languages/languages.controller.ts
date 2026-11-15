import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { LanguagesService } from './languages.service.js';

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List active supported learning languages' })
  findAll() {
    return this.languagesService.findAllActive();
  }
}
