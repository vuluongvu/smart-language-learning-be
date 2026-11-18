export interface MysqlSslOptions {
  rejectUnauthorized: boolean;
}

/**
 * Resolves TypeORM/mysql2 SSL configuration from environment flags.
 */
export function resolveMysqlSslConfig(
  dbSsl: unknown,
  rejectUnauthorized: unknown,
): MysqlSslOptions | undefined {
  const enabled = dbSsl === true || dbSsl === 'true';
  if (!enabled) {
    return undefined;
  }
  const strict = rejectUnauthorized !== false && rejectUnauthorized !== 'false';
  return { rejectUnauthorized: strict };
}
