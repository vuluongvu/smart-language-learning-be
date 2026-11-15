import {
  addCalendarDays,
  diffCalendarDays,
  formatDateInTimezone,
  getDaysInMonth,
  isValidIanaTimezone,
  resolveSafeTimezone,
} from './timezone.util.js';

describe('timezone.util', () => {
  it('validates IANA timezones and falls back safely to UTC', () => {
    expect(isValidIanaTimezone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidIanaTimezone('America/New_York')).toBe(true);
    expect(isValidIanaTimezone('Invalid/Zone')).toBe(false);
    expect(resolveSafeTimezone('Invalid/Zone')).toBe('UTC');
    expect(resolveSafeTimezone('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('resolves activity dates across timezone boundaries, leap days, and DST transitions', () => {
    // 2026-11-15T18:30:00Z is already 2026-11-16 in Asia/Ho_Chi_Minh (+07:00),
    // but still 2026-11-15 in America/Los_Angeles (-08:00)
    const instant = new Date('2026-11-15T18:30:00Z');
    expect(formatDateInTimezone(instant, 'Asia/Ho_Chi_Minh')).toBe(
      '2026-11-16',
    );
    expect(formatDateInTimezone(instant, 'America/Los_Angeles')).toBe(
      '2026-11-15',
    );

    // Leap day handling
    expect(diffCalendarDays('2024-02-28', '2024-02-29')).toBe(1);
    expect(diffCalendarDays('2024-02-29', '2024-03-01')).toBe(1);
    expect(addCalendarDays('2024-02-28', 2)).toBe('2024-03-01');
    expect(getDaysInMonth(2024, 2)).toBe(29);
    expect(getDaysInMonth(2026, 2)).toBe(28);

    // Year rollover & DST spring-forward date math
    expect(diffCalendarDays('2025-12-31', '2026-01-01')).toBe(1);
    expect(diffCalendarDays('2026-03-07', '2026-03-08')).toBe(1);
  });
});
