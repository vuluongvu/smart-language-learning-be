import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { vi } from 'vitest';
import {
  assertResourceOwnership,
  OwnershipGuard,
  OwnershipResolver,
} from './ownership.guard.js';

describe('OwnershipGuard & assertResourceOwnership', () => {
  it('allows matching owner and throws ForbiddenException on mismatch', () => {
    expect(() => assertResourceOwnership(10, 10, 'Topic')).not.toThrow();
    expect(() => assertResourceOwnership(10, 99, 'Topic')).toThrow(
      ForbiddenException,
    );
  });

  it('checks ownership via OwnershipResolver when metadata is set', async () => {
    const reflector = {
      getAllAndOverride: vi
        .fn()
        .mockReturnValueOnce('topic')
        .mockReturnValueOnce('id'),
    } as unknown as Reflector;

    const resolver: OwnershipResolver = {
      isOwner: vi.fn().mockResolvedValue(false),
    };

    const guard = new OwnershipGuard(reflector, resolver);
    const context = {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userId: 1 },
          params: { id: '5' },
        }),
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
    expect(resolver.isOwner).toHaveBeenCalledWith('topic', 5, 1);
  });
});
