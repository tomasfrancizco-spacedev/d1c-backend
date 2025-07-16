import { MigrationInterface, QueryRunner } from 'typeorm';

export class createCollegesTable1700000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Colleges Table Definition
        CREATE TABLE "college"(
            "id" BIGSERIAL PRIMARY KEY,
            "name" varchar(60) NOT NULL UNIQUE,
            "commonName" varchar(40) NOT NULL,
            "nickname" varchar(40) NOT NULL,
            "city" varchar(40) NOT NULL,
            "state" varchar(40) NOT NULL,
            "type" varchar(40) NOT NULL,
            "subdivision" varchar(40) NOT NULL,
            "primary" varchar(40) NOT NULL,
            "walletAddress" varchar(40) NOT NULL
        );
       `,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "college";', undefined);
  }
} 