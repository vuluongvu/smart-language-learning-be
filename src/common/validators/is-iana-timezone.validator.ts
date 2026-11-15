import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidIanaTimezone } from '../utils/timezone.util.js';

@ValidatorConstraint({ name: 'isIanaTimezone', async: false })
export class IsIanaTimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidIanaTimezone(value);
  }

  defaultMessage(): string {
    return 'timezone must be a valid IANA timezone identifier (e.g., Asia/Ho_Chi_Minh, UTC)';
  }
}

export function IsIanaTimezone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIanaTimezoneConstraint,
    });
  };
}
