import { MigrationInterface, QueryRunner } from 'typeorm';

export class addTradingVolumeUniqueConstraint1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, check if the constraint already exists
    const constraintExists = await queryRunner.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name LIKE '%trading_volume_stats%periodtype%periodstart%' 
      AND table_name = 'trading_volume_stats'
    `);

    if (constraintExists.length === 0) {
      await queryRunner.query(
        `ALTER TABLE "trading_volume_stats" ADD CONSTRAINT "UQ_trading_volume_period_start" UNIQUE ("periodType", "periodStart");`,
        undefined,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "trading_volume_stats" DROP CONSTRAINT IF EXISTS "UQ_trading_volume_period_start";`,
      undefined,
    );
  }
}