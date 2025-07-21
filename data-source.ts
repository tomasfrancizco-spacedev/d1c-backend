import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

const host = process.env.POSTGRES_HOST;
const isLocalhost = host === 'localhost' || host === '127.0.0.1';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: isLocalhost,
  migrationsRun: !isLocalhost,
  logging: process.env.NODE_ENV === 'development',
  ...(isLocalhost ? {} : {
    ssl: {
      rejectUnauthorized: false
    }
  })
});