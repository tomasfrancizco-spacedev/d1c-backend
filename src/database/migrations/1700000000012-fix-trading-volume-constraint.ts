import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixTradingVolumeConstraint1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if constraint already exists
    const result = await queryRunner.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'trading_volume_stats' 
      AND constraint_type = 'UNIQUE'
      AND constraint_name LIKE '%period%'
    `);

    if (result.length === 0) {
      await queryRunner.query(`
        ALTER TABLE trading_volume_stats 
        ADD CONSTRAINT uq_trading_volume_period_start 
        UNIQUE ("periodType", "periodStart")
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE trading_volume_stats 
      DROP CONSTRAINT IF EXISTS uq_trading_volume_period_start
    `);
  }
}