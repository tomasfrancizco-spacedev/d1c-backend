import { MigrationInterface, QueryRunner } from 'typeorm';

export class fixTradingVolumeConstraint1700000000010 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the table and recreate it with proper constraints
    await queryRunner.query(`
      ALTER TABLE "trading_volume_stats" 
      ADD CONSTRAINT "UQ_trading_volume_stats_period_type_start" 
      UNIQUE ("periodType", "periodStart");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "trading_volume_stats" 
      DROP CONSTRAINT IF EXISTS "UQ_trading_volume_stats_period_type_start";
    `);
  }
}