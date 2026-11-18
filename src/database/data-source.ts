import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { resolveMysqlSslConfig } from '../common/utils/db-ssl.util.js';

const ssl = resolveMysqlSslConfig(
  process.env.DB_SSL,
  process.env.DB_SSL_REJECT_UNAUTHORIZED,
);

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3311),
  username: process.env.DB_USERNAME ?? 'argon_learning',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'argon_learning',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  timezone: 'Z',
  ...(ssl ? { ssl } : {}),
});
