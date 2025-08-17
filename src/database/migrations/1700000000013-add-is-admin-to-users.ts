import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsAdminToUsers1700000000013 implements MigrationInterface {
  name = 'AddIsAdminToUsers1700000000013'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD "isAdmin" boolean NOT NULL DEFAULT false`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "isAdmin"`);
  }
}