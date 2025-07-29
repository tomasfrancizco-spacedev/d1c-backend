import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateUserCurrentLinkedCollegeLength1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "currentLinkedCollege" TYPE varchar(44);`,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "currentLinkedCollege" TYPE varchar(40);`,
      undefined,
    );
  }
} 