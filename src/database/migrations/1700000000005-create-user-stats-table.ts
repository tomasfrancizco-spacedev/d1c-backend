import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUserStatsTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- User Statistics Table
        CREATE TABLE "user_stats"(
            "id" BIGSERIAL PRIMARY KEY,
            "userId" BIGINT NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
            "walletAddress" varchar(44) NOT NULL,
            "totalContributions" decimal(20,8) NOT NULL DEFAULT 0,
            "transactionCount" integer NOT NULL DEFAULT 0,
            "lastContributionDate" timestamptz,
            "rankPosition" integer,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt" timestamptz NOT NULL DEFAULT now(),
            UNIQUE("userId")
        );
        
        -- Add indexes for performance
        CREATE INDEX "IDX_user_stats_wallet" ON "user_stats"("walletAddress");
        CREATE INDEX "IDX_user_stats_contributions" ON "user_stats"("totalContributions" DESC);
        CREATE INDEX "IDX_user_stats_rank" ON "user_stats"("rankPosition");
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user_stats";', undefined);
  }
}