export function parseCorsOrigins(
  rawOrigin?: string,
  nodeEnv?: string,
): string[] | boolean {
  const parsed = (rawOrigin ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin.length > 0 && origin !== '*');

  if (parsed.length > 0) {
    return parsed;
  }

  if (nodeEnv === 'production') {
    return false;
  }

  return ['http://localhost:4200'];
}
