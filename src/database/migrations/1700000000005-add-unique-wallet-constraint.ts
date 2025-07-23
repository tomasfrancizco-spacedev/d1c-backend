import { MigrationInterface, QueryRunner } from 'typeorm';

export class addUniqueWalletConstraint1700000000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Add unique constraint on walletAddress
        ALTER TABLE "user" ADD CONSTRAINT "UQ_user_walletAddress" UNIQUE ("walletAddress");
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Remove unique constraint on walletAddress
        ALTER TABLE "user" DROP CONSTRAINT "UQ_user_walletAddress";
       `,
      undefined,
    );
  }
} 