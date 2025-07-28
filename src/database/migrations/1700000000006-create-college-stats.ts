import { MigrationInterface, QueryRunner } from 'typeorm';

export class createCollegeStatsTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- College Statistics Table
        CREATE TABLE "college_stats"(
            "id" BIGSERIAL PRIMARY KEY,
            "collegeId" BIGINT NOT NULL REFERENCES "college"("id") ON DELETE CASCADE,
            "walletAddress" varchar(44) NOT NULL,
            "totalContributionsReceived" decimal(20,8) NOT NULL DEFAULT 0,
            "transactionCount" integer NOT NULL DEFAULT 0,
            "lastContributionDate" timestamptz,
            "rankPosition" integer,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt" timestamptz NOT NULL DEFAULT now(),
            UNIQUE("collegeId")
        );
        
        -- Add indexes for performance
        CREATE INDEX "IDX_college_stats_wallet" ON "college_stats"("walletAddress");
        CREATE INDEX "IDX_college_stats_contributions" ON "college_stats"("totalContributionsReceived" DESC);
        CREATE INDEX "IDX_college_stats_rank" ON "college_stats"("rankPosition");
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "college_stats";', undefined);
  }
}