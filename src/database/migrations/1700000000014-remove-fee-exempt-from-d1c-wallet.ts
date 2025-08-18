import { MigrationInterface, QueryRunner } from 'typeorm';

export class removeFeeExemptFromD1cWallet1700000000014 implements MigrationInterface {
  name = 'removeFeeExemptFromD1cWallet1700000000014'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "d1c_wallet" DROP COLUMN IF EXISTS "fee_exempt";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "d1c_wallet" ADD COLUMN "fee_exempt" boolean NOT NULL DEFAULT false;
    `);
  }
}
