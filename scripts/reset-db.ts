import { DataSource } from 'typeorm';
import { AppDataSource } from '../data-source';

const resetDatabase = async () => {
  const dataSource = new DataSource(AppDataSource.options);

  try {
    await dataSource.initialize();
    const queryRunner = dataSource.createQueryRunner();

    console.log('🧨 Dropping all tables...');
    await queryRunner.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);

    console.log('📦 Running all migrations...');
    await dataSource.runMigrations();

    console.log('✅ Database reset and migrations run successfully');
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
};

resetDatabase();