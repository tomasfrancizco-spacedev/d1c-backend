import { MigrationInterface, QueryRunner } from 'typeorm';

export class createBurnTracker1700000000010 implements MigrationInterface {
  name = 'createBurnTracker1700000000010'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "burn_tracker" (
        "id" BIGSERIAL PRIMARY KEY,
        "periodStartAt" timestamptz NOT NULL,
        "burnedAmount" decimal(20,8) NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "IDX_burn_tracker_periodStartAt" ON "burn_tracker"("periodStartAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_burn_tracker_periodStartAt";
      DROP TABLE IF EXISTS "burn_tracker";
    `);
  }
}


