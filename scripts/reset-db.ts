import { AppDataSource } from '../data-source';

async function resetDatabase() {
  try {
    // Initialize connection
    await AppDataSource.initialize();
    
    console.log('🔄 Dropping all tables...');
    
    // Drop tables in correct order (due to foreign keys)
    await AppDataSource.query('DROP TABLE IF EXISTS "user" CASCADE;');
    await AppDataSource.query('DROP TABLE IF EXISTS "college" CASCADE;');
    
    console.log('✅ Database tables dropped successfully');
    
    await AppDataSource.destroy();
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

resetDatabase();