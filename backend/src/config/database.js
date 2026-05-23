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
  synchronize: false,
  logging: env.isProd ? ['error'] : ['error', 'warn'],
  entities: ['src/models/*.entity.js'],
  migrations: ['src/migrations/*.js'],
});

export { dataSource };
