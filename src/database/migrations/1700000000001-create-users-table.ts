import { MigrationInterface, QueryRunner } from 'typeorm';

export class createUsersTable1700000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Users Table Definition
        CREATE TABLE "user"(
            "id" BIGSERIAL PRIMARY KEY,
            "email" varchar(40) NOT NULL UNIQUE,
            "wallet" varchar(40) NOT NULL,
            "isActive" BOOL NOT NULL DEFAULT FALSE,
            "lastLogin" timestamptz NOT NULL DEFAULT now(),
            "currentLinkedCollege" varchar(40),
            "linkedCollegeHistory" varchar[] DEFAULT '{}'
        );
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "user";', undefined);
  }
} 