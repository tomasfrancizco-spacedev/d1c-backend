import { MigrationInterface, QueryRunner } from 'typeorm';

export class updateTransactionFeeColumns1700000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Rename 'processed' column to 'fee_harvested'
    await queryRunner.query(`
      ALTER TABLE "transaction" 
      RENAME COLUMN "processed" TO "fee_harvested";
    `);

    // Add 'fee_distributed' column
    await queryRunner.query(`
      ALTER TABLE "transaction" 
      ADD COLUMN "fee_distributed" boolean NOT NULL DEFAULT false;
    `);

    // Create indexes for the new columns
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_fee_harvested" ON "transaction"("fee_harvested");
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_fee_distributed" ON "transaction"("fee_distributed");
    `);

    // Create composite index for efficient querying
    await queryRunner.query(`
      CREATE INDEX "IDX_transaction_fee_status" ON "transaction"("fee_harvested", "fee_distributed");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`
      DROP INDEX "IDX_transaction_fee_status";
    `);
    
    await queryRunner.query(`
      DROP INDEX "IDX_transaction_fee_distributed";
    `);
    
    await queryRunner.query(`
      DROP INDEX "IDX_transaction_fee_harvested";
    `);

    // Remove 'fee_distributed' column
    await queryRunner.query(`
      ALTER TABLE "transaction" 
      DROP COLUMN "fee_distributed";
    `);

    // Rename 'fee_harvested' back to 'processed'
    await queryRunner.query(`
      ALTER TABLE "transaction" 
      RENAME COLUMN "fee_harvested" TO "processed";
    `);
  }
}
