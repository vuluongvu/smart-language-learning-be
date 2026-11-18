import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { vi } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should return health status payload', async () => {
      const result = await appController.getHealth();
      expect(result.status).toBe('ok');
      expect(result.database).toBe('skipped');
      expect(typeof result.timestamp).toBe('string');
      expect(Number.isNaN(Date.parse(result.timestamp))).toBe(false);
    });

    it('verifies initialized DataSource and throws 503 when MySQL is unreachable', async () => {
      const mockQuery = vi.fn().mockResolvedValueOnce([{ 1: 1 }]);
      const controllerWithDb = new AppController(new AppService(), {
        isInitialized: true,
        query: mockQuery,
      } as unknown as DataSource);

      const ok = await controllerWithDb.getHealth();
      expect(ok.status).toBe('ok');
      expect(ok.database).toBe('up');

      mockQuery.mockRejectedValueOnce(new Error('ECONNREFUSED'));
      await expect(controllerWithDb.getHealth()).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });
});
