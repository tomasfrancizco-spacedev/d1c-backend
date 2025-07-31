import { MigrationInterface, QueryRunner } from 'typeorm';

export class addContributionsColumnToUserStats1700000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if contributions column already exists
    const contributionsColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'user_stats' AND column_name = 'contributions';
    `);

    if (contributionsColumnExists.length === 0) {
      // Add contributions column (college-specific contributions)
      await queryRunner.query(`
        ALTER TABLE user_stats 
        ADD COLUMN "contributions" decimal(20,8) NOT NULL DEFAULT 0;
      `);

      // Initialize contributions with current totalContributions values
      await queryRunner.query(`
        UPDATE user_stats 
        SET "contributions" = "totalContributions";
      `);
      
      console.log('✅ Added contributions column and initialized values');
    } else {
      console.log('ℹ️  contributions column already exists, skipping creation');
      
      // Still initialize contributions if they're all zero
      const zeroContributions = await queryRunner.query(`
        SELECT COUNT(*) as count FROM user_stats WHERE "contributions" = 0 AND "totalContributions" > 0;
      `);
      
      if (parseInt(zeroContributions[0].count) > 0) {
        await queryRunner.query(`
          UPDATE user_stats 
          SET "contributions" = "totalContributions"
          WHERE "contributions" = 0 AND "totalContributions" > 0;
        `);
        console.log('✅ Initialized contributions with totalContributions values');
      }
    }

    // Check if index already exists
    const indexExists = await queryRunner.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'user_stats' AND indexname = 'IDX_user_stats_wallet_address';
    `);

    if (indexExists.length === 0) {
      await queryRunner.query(`
        CREATE INDEX "IDX_user_stats_wallet_address" ON user_stats("walletAddress");
      `);
      console.log('✅ Created wallet address index');
    } else {
      console.log('ℹ️  Index already exists, skipping creation');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Safe rollback - check before dropping
    const indexExists = await queryRunner.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename = 'user_stats' AND indexname = 'IDX_user_stats_wallet_address';
    `);

    if (indexExists.length > 0) {
      await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_stats_wallet_address";`);
    }

    const contributionsColumnExists = await queryRunner.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'user_stats' AND column_name = 'contributions';
    `);

    if (contributionsColumnExists.length > 0) {
      await queryRunner.query(`ALTER TABLE user_stats DROP COLUMN "contributions";`);
    }
  }
}