import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Users Table Definition (complete)
        CREATE TABLE "user"(
            "id" BIGSERIAL PRIMARY KEY,
            "email" varchar(40) NOT NULL UNIQUE,
            "walletAddress" varchar(44) NOT NULL,
            "wallets" varchar[] DEFAULT NULL,
            "isActive" BOOL NOT NULL DEFAULT FALSE,
            "lastLogin" timestamptz DEFAULT NULL,
            "currentLinkedCollege" varchar(40),
            "linkedCollegeHistory" varchar[] DEFAULT '{}',
            "otpCode" varchar(6),
            "otpExpiration" timestamptz,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        );
        
        -- Add unique constraint on walletAddress
        ALTER TABLE "user" ADD CONSTRAINT "UQ_user_walletAddress" UNIQUE ("walletAddress");
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user";', undefined);
  }
} 