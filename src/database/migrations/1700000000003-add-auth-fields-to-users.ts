import { MigrationInterface, QueryRunner } from 'typeorm';

export class addAuthFieldsToUsers1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Rename wallet column to walletAddress and make it unique
        ALTER TABLE "user" RENAME COLUMN "wallet" TO "walletAddress";
        ALTER TABLE "user" ALTER COLUMN "walletAddress" TYPE varchar(44);
        ALTER TABLE "user" ADD CONSTRAINT "UQ_user_walletAddress" UNIQUE ("walletAddress");
        
        -- Add OTP fields
        ALTER TABLE "user" ADD COLUMN "otpCode" varchar(6);
        ALTER TABLE "user" ADD COLUMN "otpExpiration" timestamptz;
        
        -- Add timestamp fields
        ALTER TABLE "user" ADD COLUMN "createdAt" timestamptz NOT NULL DEFAULT now();
        ALTER TABLE "user" ADD COLUMN "updatedAt" timestamptz NOT NULL DEFAULT now();
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Remove timestamp fields
        ALTER TABLE "user" DROP COLUMN "updatedAt";
        ALTER TABLE "user" DROP COLUMN "createdAt";
        
        -- Remove OTP fields
        ALTER TABLE "user" DROP COLUMN "otpExpiration";
        ALTER TABLE "user" DROP COLUMN "otpCode";
        
        -- Revert wallet column changes
        ALTER TABLE "user" DROP CONSTRAINT "UQ_user_walletAddress";
        ALTER TABLE "user" ALTER COLUMN "walletAddress" TYPE varchar(40);
        ALTER TABLE "user" RENAME COLUMN "walletAddress" TO "wallet";
       `,
      undefined,
    );
  }
} 