import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity.js';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async findAllActive(): Promise<Language[]> {
    return this.languageRepository.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
  }

  async findActiveByCode(code: string): Promise<Language> {
    const language = await this.languageRepository.findOne({
      where: { code: code.toLowerCase(), isActive: true },
    });
    if (!language) {
      throw new NotFoundException(`Language '${code}' not found`);
    }
    return language;
  }
}
