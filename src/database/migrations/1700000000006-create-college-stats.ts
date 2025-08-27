import { MigrationInterface, QueryRunner } from 'typeorm';

export class createCollegeStatsTable1700000000006 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "college_stats" (
        "id" BIGSERIAL PRIMARY KEY,
        "collegeId" BIGINT NOT NULL,
        "walletAddress" varchar(44) NOT NULL,
        "totalContributionsReceived" decimal(20,8) NOT NULL DEFAULT 0,
        "transactionCount" integer NOT NULL DEFAULT 0,
        "lastContributionDate" timestamptz,
        "rankPosition" integer,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_college_stats_collegeId" FOREIGN KEY ("collegeId") REFERENCES "college"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_college_stats_collegeId" UNIQUE ("collegeId")
      );

      CREATE INDEX "IDX_college_stats_wallet" ON "college_stats"("walletAddress");
      CREATE INDEX "IDX_college_stats_contributions" ON "college_stats"("totalContributionsReceived" DESC);
      CREATE INDEX "IDX_college_stats_rank" ON "college_stats"("rankPosition");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "college_stats";`);
  }
}