import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LEARNING_PATH_CATALOG } from './data/learning-path.catalog.js';
import { LearningPathPart } from './entities/learning-path-part.entity.js';
import { LearningPathTrack } from './entities/learning-path-track.entity.js';
import { LearningPathUnit } from './entities/learning-path-unit.entity.js';

@Injectable()
export class LearningPathCatalogService implements OnModuleInit {
  private readonly logger = new Logger(LearningPathCatalogService.name);
  private synced = false;

  constructor(
    @InjectRepository(LearningPathTrack)
    private readonly trackRepo: Repository<LearningPathTrack>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.ensureSeeded();
    } catch (error) {
      // Allow tests or CLI pre-migration contexts to skip safely until tables exist
      this.logger.warn(
        `Skipping Learning Path startup catalog sync: ${(error as Error).message}`,
      );
    }
  }

  async ensureSeeded(): Promise<void> {
    if (this.synced) {
      return;
    }

    await this.dataSource.transaction(async (manager) => {
      const tRepo = manager.getRepository(LearningPathTrack);
      const pRepo = manager.getRepository(LearningPathPart);
      const uRepo = manager.getRepository(LearningPathUnit);

      for (let tIdx = 0; tIdx < LEARNING_PATH_CATALOG.length; tIdx += 1) {
        const trackSpec = LEARNING_PATH_CATALOG[tIdx];
        let track = await tRepo.findOneBy({ code: trackSpec.code });
        if (!track) {
          track = tRepo.create({
            code: trackSpec.code,
            title: trackSpec.title,
            cefrLevel: trackSpec.cefrLevel,
            languageCode: trackSpec.languageCode,
            summary: trackSpec.summary,
            sortOrder: tIdx + 1,
          });
        } else {
          track.title = trackSpec.title;
          track.cefrLevel = trackSpec.cefrLevel;
          track.summary = trackSpec.summary;
          track.sortOrder = tIdx + 1;
        }
        track = await tRepo.save(track);

        for (let pIdx = 0; pIdx < trackSpec.parts.length; pIdx += 1) {
          const partSpec = trackSpec.parts[pIdx];
          let part = await pRepo.findOneBy({
            trackId: track.id,
            partNumber: partSpec.partNumber,
          });
          if (!part) {
            part = pRepo.create({
              trackId: track.id,
              partNumber: partSpec.partNumber,
              title: partSpec.title,
              subtitle: partSpec.subtitle,
              sortOrder: pIdx + 1,
            });
          } else {
            part.title = partSpec.title;
            part.subtitle = partSpec.subtitle;
            part.sortOrder = pIdx + 1;
          }
          part = await pRepo.save(part);

          for (let uIdx = 0; uIdx < partSpec.units.length; uIdx += 1) {
            const unitSpec = partSpec.units[uIdx];
            let unit = await uRepo.findOneBy({ slug: unitSpec.slug });
            if (!unit) {
              unit = uRepo.create({
                partId: part.id,
                unitNumber: unitSpec.unitNumber,
                slug: unitSpec.slug,
                title: unitSpec.title,
                topicName: unitSpec.topicName,
                icon: unitSpec.icon,
                themeColor: unitSpec.themeColor,
                grammarFocus: unitSpec.grammarFocus,
                vocabularyJson: unitSpec.vocabulary,
                readingPassageJson: unitSpec.readingListening,
                writingPromptJson: unitSpec.writing,
                speakingTopicPrompt: unitSpec.speakingTopicPrompt,
                sortOrder: uIdx + 1,
              });
            } else {
              unit.partId = part.id;
              unit.unitNumber = unitSpec.unitNumber;
              unit.title = unitSpec.title;
              unit.topicName = unitSpec.topicName;
              unit.icon = unitSpec.icon;
              unit.themeColor = unitSpec.themeColor;
              unit.grammarFocus = unitSpec.grammarFocus;
              unit.vocabularyJson = unitSpec.vocabulary;
              unit.readingPassageJson = unitSpec.readingListening;
              unit.writingPromptJson = unitSpec.writing;
              unit.speakingTopicPrompt = unitSpec.speakingTopicPrompt;
              unit.sortOrder = uIdx + 1;
            }
            await uRepo.save(unit);
          }
        }
      }
    });

    const trackCount = await this.trackRepo.count();
    this.synced = trackCount >= LEARNING_PATH_CATALOG.length;
  }
}
