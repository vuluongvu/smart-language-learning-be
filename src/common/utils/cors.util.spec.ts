import { parseCorsOrigins } from './cors.util.js';

describe('parseCorsOrigins', () => {
  it('parses comma-separated origins and strips wildcards/whitespace', () => {
    expect(
      parseCorsOrigins(
        'http://localhost:4200, https://app.example.com , *',
        'production',
      ),
    ).toEqual(['http://localhost:4200', 'https://app.example.com']);
  });

  it('defaults to localhost:4200 in development when unconfigured', () => {
    expect(parseCorsOrigins(undefined, 'development')).toEqual([
      'http://localhost:4200',
    ]);
  });

  it('fails closed in production when only wildcard or empty string is set', () => {
    expect(parseCorsOrigins('*', 'production')).toBe(false);
    expect(parseCorsOrigins('', 'production')).toBe(false);
  });
});
