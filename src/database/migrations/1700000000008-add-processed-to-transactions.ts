import { MigrationInterface, QueryRunner } from 'typeorm';

export class addProcessedToTransactions1700000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "transaction" 
      ADD COLUMN "processed" boolean NOT NULL DEFAULT false;
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_processed" ON "transaction"("processed");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "IDX_transaction_processed";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "transaction" 
      DROP COLUMN "processed";
    `);
  }
}
