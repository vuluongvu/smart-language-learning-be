import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const OWNERSHIP_RESOURCE_KEY = 'ownership_resource';
export const OWNERSHIP_PARAM_KEY = 'ownership_param';

export interface OwnershipResolver {
  isOwner(
    resourceType: string,
    resourceId: number,
    userId: number,
  ): Promise<boolean>;
}

export const OWNERSHIP_RESOLVER = Symbol('OWNERSHIP_RESOLVER');

export function CheckOwnership(resourceType: string, paramName = 'id') {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    SetMetadata(OWNERSHIP_RESOURCE_KEY, resourceType)(
      target,
      propertyKey,
      descriptor,
    );
    SetMetadata(OWNERSHIP_PARAM_KEY, paramName)(
      target,
      propertyKey,
      descriptor,
    );
  };
}

/**
 * Verifies that the authenticated actor owns the requested resource.
 */
export function assertResourceOwnership(
  ownerId: number,
  actorUserId: number,
  resourceName = 'Resource',
): void {
  if (ownerId !== actorUserId) {
    throw new ForbiddenException(
      `You do not have permission to access this ${resourceName.toLowerCase()}`,
    );
  }
}

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional()
    @Inject(OWNERSHIP_RESOLVER)
    private readonly resolver?: OwnershipResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const resourceType = this.reflector.getAllAndOverride<string>(
      OWNERSHIP_RESOURCE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!resourceType) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = Number(request.user?.userId);
    const paramName =
      this.reflector.getAllAndOverride<string>(OWNERSHIP_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'id';
    const resourceId = Number(request.params?.[paramName]);

    if (!userId || !Number.isInteger(resourceId) || resourceId <= 0) {
      throw new ForbiddenException('Invalid resource ownership context');
    }

    if (!this.resolver) {
      throw new ForbiddenException('Ownership resolver is not configured');
    }

    const owns = await this.resolver.isOwner(resourceType, resourceId, userId);
    if (!owns) {
      throw new ForbiddenException(
        `You do not have permission to access this ${resourceType}`,
      );
    }

    return true;
  }
}
