import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUserStatsTable1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user_stats" (
        "id" BIGSERIAL PRIMARY KEY,
        "userId" BIGINT,
        "walletAddress" varchar(44) NOT NULL,
        "linkedCollegeId" BIGINT,
        "contributions" decimal(20,8) NOT NULL DEFAULT 0,
        "totalContributions" decimal(20,8) NOT NULL DEFAULT 0,
        "transactionCount" integer NOT NULL DEFAULT 0,
        "lastContributionDate" timestamptz,
        "rankPosition" integer,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        
        CONSTRAINT "FK_user_stats_userId" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL,
        CONSTRAINT "FK_user_stats_collegeId" FOREIGN KEY ("linkedCollegeId") REFERENCES "college"("id") ON DELETE SET NULL
      );

      -- Columna generada que permite ON CONFLICT sin que falle por NULL
      ALTER TABLE "user_stats"
      ADD COLUMN "linkedCollegeIdSafe" BIGINT GENERATED ALWAYS AS (COALESCE("linkedCollegeId", -1)) STORED;

      -- Guardar metadata de columna generada para TypeORM
      INSERT INTO "typeorm_metadata"("type", "database", "schema", "table", "name", "value")
      VALUES ('GENERATED_COLUMN', current_database(), 'public', 'user_stats', 'linkedCollegeIdSafe', 'COALESCE("linkedCollegeId", -1)');

      -- Constraint de unicidad para el upsert
      ALTER TABLE "user_stats"
      ADD CONSTRAINT "UQ_user_stats_wallet_college_safe" UNIQUE ("walletAddress", "linkedCollegeIdSafe");

      -- Indexes útiles
      CREATE INDEX "IDX_user_stats_wallet" ON "user_stats"("walletAddress");
      CREATE INDEX "IDX_user_stats_contributions" ON "user_stats"("totalContributions" DESC);
      CREATE INDEX "IDX_user_stats_rank" ON "user_stats"("rankPosition");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "user_stats";
      DELETE FROM "typeorm_metadata" WHERE "table" = 'user_stats' AND "name" = 'linkedCollegeIdSafe';
    `);
  }
}