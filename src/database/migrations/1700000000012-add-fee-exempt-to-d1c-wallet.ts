import { MigrationInterface, QueryRunner } from 'typeorm';

export class addFeeExemptToD1cWallet1700000000012 implements MigrationInterface {
  name = 'addFeeExemptToD1cWallet1700000000012'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "d1c_wallet" ADD COLUMN "fee_exempt" boolean NOT NULL DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "d1c_wallet" DROP COLUMN IF EXISTS "fee_exempt";
    `);
  }
}


