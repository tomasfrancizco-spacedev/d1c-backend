import { MigrationInterface, QueryRunner } from 'typeorm';

export class createFeeJobLogs1700000000014 implements MigrationInterface {
  name = 'createFeeJobLogs1700000000014'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "fee_job_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "executedAt" timestamptz NOT NULL,
        "success" boolean NOT NULL,
        "harvestedAmount" decimal(20,8) DEFAULT 0,
        "distributedAmount" decimal(20,8) DEFAULT 0,
        "burnedAmount" decimal(20,8) DEFAULT 0,
        "errorMessage" text NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      );

      CREATE INDEX "IDX_fee_job_logs_executedAt" ON "fee_job_logs"("executedAt");
      CREATE INDEX "IDX_fee_job_logs_success" ON "fee_job_logs"("success");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_fee_job_logs_success";
      DROP INDEX IF EXISTS "IDX_fee_job_logs_executedAt";
      DROP TABLE IF EXISTS "fee_job_logs";
    `);
  }
}
