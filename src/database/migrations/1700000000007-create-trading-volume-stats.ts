import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTradingVolumeStatsTable1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Trading Volume Statistics Table
        CREATE TABLE "trading_volume_stats"(
            "id" BIGSERIAL PRIMARY KEY,
            "periodType" varchar(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'yearly', 'all_time'
            "periodStart" timestamptz NOT NULL,
            "periodEnd" timestamptz,
            "totalVolume" decimal(20,8) NOT NULL DEFAULT 0,
            "transactionCount" integer NOT NULL DEFAULT 0,
            "uniqueUsers" integer NOT NULL DEFAULT 0,
            "uniqueColleges" integer NOT NULL DEFAULT 0,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt" timestamptz NOT NULL DEFAULT now(),
            UNIQUE("periodType", "periodStart")
        );
        
        -- Add indexes for performance
        CREATE INDEX "IDX_trading_volume_period" ON "trading_volume_stats"("periodType", "periodStart");
        CREATE INDEX "IDX_trading_volume_total" ON "trading_volume_stats"("totalVolume" DESC);
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "trading_volume_stats";', undefined);
  }
}