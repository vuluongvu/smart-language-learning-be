export function isValidIanaTimezone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string') {
    return false;
  }

  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveSafeTimezone(timeZone?: string | null): string {
  if (timeZone && isValidIanaTimezone(timeZone)) {
    return timeZone;
  }
  return 'UTC';
}

export function formatDateInTimezone(
  date: Date,
  timeZone?: string | null,
): string {
  const safeTz = resolveSafeTimezone(timeZone);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: safeTz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${year}-${month}-${day}`;
}

export function normalizeDateOnly(
  value: string | Date | null | undefined,
): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    const match = /^(\d{4}-\d{2}-\d{2})/.exec(value.trim());
    return match ? match[1] : null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

export function parseYmdToUtcMs(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

export function diffCalendarDays(fromYmd: string, toYmd: string): number {
  const diffMs = parseYmdToUtcMs(toYmd) - parseYmdToUtcMs(fromYmd);
  return Math.round(diffMs / 86_400_000);
}

export function addCalendarDays(ymd: string, deltaDays: number): string {
  const utc = new Date(parseYmdToUtcMs(ymd) + deltaDays * 86_400_000);
  return utc.toISOString().slice(0, 10);
}

export function getDaysInMonth(year: number, month1Based: number): number {
  return new Date(Date.UTC(year, month1Based, 0)).getUTCDate();
}

export function getWeekdaySundayFirst(ymd: string): number {
  return new Date(parseYmdToUtcMs(ymd)).getUTCDay();
}
