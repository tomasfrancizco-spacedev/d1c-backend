import { MigrationInterface, QueryRunner } from 'typeorm';

export class createTransactionsTable1700000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "transaction" (
        "id" BIGSERIAL PRIMARY KEY,
        "from" varchar(44),
        "to" varchar(44),
        "timestamp" timestamptz,
        "amount" decimal(20,8) NOT NULL DEFAULT 0,
        "d1cFee" decimal(20,8) NOT NULL DEFAULT 0,
        "linkedCollegeId" bigint,
        "signature" varchar(88) NOT NULL UNIQUE,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_transaction_linkedCollege" FOREIGN KEY ("linkedCollegeId") REFERENCES "college"("id") ON DELETE SET NULL
      );

      CREATE INDEX "IDX_transaction_from" ON "transaction"("from");
      CREATE INDEX "IDX_transaction_to" ON "transaction"("to");
      CREATE INDEX "IDX_transaction_timestamp" ON "transaction"("timestamp");
      CREATE INDEX "IDX_transaction_signature" ON "transaction"("signature");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "transaction";`);
  }
}