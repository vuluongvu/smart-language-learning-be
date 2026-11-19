import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity.js';

@Injectable()
export class LanguagesService implements OnModuleInit {
  private readonly logger = new Logger(LanguagesService.name);

  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const defaults = [
        { code: 'en', name: 'English' },
        { code: 'ko', name: 'Korean' },
      ];
      for (const entry of defaults) {
        const existing = await this.languageRepository.findOne({
          where: { code: entry.code },
        });
        if (!existing) {
          await this.languageRepository.save(
            this.languageRepository.create({
              code: entry.code,
              name: entry.name,
              isActive: true,
            }),
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Skipping startup language sync: ${(error as Error).message}`,
      );
    }
  }

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
