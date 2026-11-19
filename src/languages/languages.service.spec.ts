import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { vi } from 'vitest';
import { Language } from './entities/language.entity.js';
import { LanguagesService } from './languages.service.js';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let repo: {
    find: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    repo = {
      find: vi
        .fn()
        .mockResolvedValue([
          { id: 1, code: 'en', name: 'English', isActive: true },
        ]),
      findOne: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguagesService,
        { provide: getRepositoryToken(Language), useValue: repo },
      ],
    }).compile();

    service = module.get<LanguagesService>(LanguagesService);
  });

  it('returns active languages', async () => {
    const langs = await service.findAllActive();
    expect(langs).toHaveLength(1);
    expect(langs[0].code).toBe('en');
  });

  it('throws NotFoundException for unknown language code', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.findActiveByCode('fr')).rejects.toThrow(
      NotFoundException,
    );
  });
});
