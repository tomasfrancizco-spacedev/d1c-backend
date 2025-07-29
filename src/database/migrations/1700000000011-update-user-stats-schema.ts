import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateUserStatsSchema1700000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Make userId nullable
      ALTER TABLE "user_stats" ALTER COLUMN "userId" DROP NOT NULL;
      
      -- Add unique constraint on walletAddress
      ALTER TABLE "user_stats" ADD CONSTRAINT "UQ_user_stats_wallet_address" UNIQUE ("walletAddress");
      
      -- Drop the old unique constraint on userId if it exists
      ALTER TABLE "user_stats" DROP CONSTRAINT IF EXISTS "UQ_user_stats_userId";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Remove unique constraint on walletAddress
      ALTER TABLE "user_stats" DROP CONSTRAINT IF EXISTS "UQ_user_stats_wallet_address";
      
      -- Make userId not null again
      ALTER TABLE "user_stats" ALTER COLUMN "userId" SET NOT NULL;
    `);
  }
}