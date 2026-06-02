import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { env } from './env.js';

const dataSource = new DataSource({
  type: 'postgres',
  host: env.db.host,
  port: env.db.port,
  username: env.db.user,
  password: env.db.password,
  database: env.db.name,
  // Managed Postgres (Neon, Supabase, Render, etc.) requires SSL. Enable it in
  // production; local dev keeps plain connections.
  ssl: env.isProd ? { rejectUnauthorized: false } : false,
  synchronize: false,
  logging: env.isProd ? ['error'] : ['error', 'warn'],
  entities: ['src/models/*.entity.js'],
  migrations: ['src/migrations/*.js'],
});

export { dataSource };
