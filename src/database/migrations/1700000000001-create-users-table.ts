import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Users Table Definition (complete)
        CREATE TABLE "user"(
            "id" BIGSERIAL PRIMARY KEY,
            "walletAddress" varchar(44) NOT NULL,
            "emails" varchar[] NOT NULL DEFAULT '{}',
            "isActive" BOOL NOT NULL DEFAULT FALSE,
            "lastLogin" timestamptz DEFAULT NULL,
            "currentLinkedCollege" varchar(40),
            "linkedCollegeHistory" varchar[] DEFAULT '{}',
            "otpCode" varchar(6),
            "otpExpiration" timestamptz,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        );`,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user";', undefined);
  }
} 