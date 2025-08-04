import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUsersTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id" BIGSERIAL PRIMARY KEY,
        "emails" varchar[] NOT NULL DEFAULT '{}',
        "walletAddress" varchar(44) NOT NULL UNIQUE,
        "isActive" BOOLEAN NOT NULL DEFAULT false,
        "lastLogin" timestamptz DEFAULT CURRENT_TIMESTAMP,
        "currentLinkedCollegeId" bigint,
        "otpCode" varchar(6),
        "otpExpiration" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_currentLinkedCollege" FOREIGN KEY ("currentLinkedCollegeId") REFERENCES "college"("id") ON DELETE SET NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE "user";
    `);
  }
}