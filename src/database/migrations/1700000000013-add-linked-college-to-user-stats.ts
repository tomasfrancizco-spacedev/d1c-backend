import { MigrationInterface, QueryRunner } from 'typeorm';

export class addLinkedCollegeToUserStats1700000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add linkedCollege column
    await queryRunner.query(`
      ALTER TABLE user_stats 
      ADD COLUMN "linkedCollege" varchar(44) NOT NULL DEFAULT '';
    `);

    // Remove unique constraint on walletAddress
    await queryRunner.query(`
      ALTER TABLE user_stats 
      DROP CONSTRAINT IF EXISTS "UQ_user_stats_walletAddress";
    `);

    // Add unique constraint on walletAddress + linkedCollege combination
    await queryRunner.query(`
      ALTER TABLE user_stats 
      ADD CONSTRAINT "UQ_user_stats_wallet_college" 
      UNIQUE ("walletAddress", "linkedCollege");
    `);

    // Update existing rows to have empty linkedCollege (representing community college)
    await queryRunner.query(`
      UPDATE user_stats 
      SET "linkedCollege" = '' 
      WHERE "linkedCollege" IS NULL OR "linkedCollege" = '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove unique constraint on walletAddress + linkedCollege
    await queryRunner.query(`
      ALTER TABLE user_stats 
      DROP CONSTRAINT IF EXISTS "UQ_user_stats_wallet_college";
    `);

    // Add back unique constraint on walletAddress
    await queryRunner.query(`
      ALTER TABLE user_stats 
      ADD CONSTRAINT "UQ_user_stats_walletAddress" 
      UNIQUE ("walletAddress");
    `);

    // Remove linkedCollege column
    await queryRunner.query(`
      ALTER TABLE user_stats 
      DROP COLUMN "linkedCollege";
    `);
  }
}