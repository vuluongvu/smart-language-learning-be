import 'reflect-metadata';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? 3311),
  username: process.env.DB_USERNAME ?? 'openquiz',
  password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_NAME ?? 'openquiz',
  entities: ['dist/**/*.entity.js'],
  migrations: ['dist/database/migrations/*.js'],
  synchronize: false,
  timezone: 'Z',
});
