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
