import { MigrationInterface, QueryRunner } from 'typeorm';

export class createD1cWalletsTable1700000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
        -- Create wallet_type enum
        CREATE TYPE "wallet_type_enum" AS ENUM('OPS', 'COMMUNITY', 'FEE_HARVESTER', 'FEE_DISTRIBUTOR');
        
        -- D1C Wallets Table Definition
        CREATE TABLE "d1c_wallet"(
            "id" BIGSERIAL PRIMARY KEY,
            "walletType" "wallet_type_enum" NOT NULL,
            "walletAddress" varchar(44) NOT NULL UNIQUE,
            "createdAt" timestamptz NOT NULL DEFAULT now(),
            "updatedAt" timestamptz NOT NULL DEFAULT now()
        );
        
        -- Add index for performance
        CREATE INDEX "IDX_d1c_wallet_type" ON "d1c_wallet"("walletType");

        -- Insert initial OPS and COMMUNITY wallets
        INSERT INTO "d1c_wallet" ("walletType", "walletAddress") 
        VALUES 
          ('OPS', 'BZwhpQztyYMd9hQkEsjypGSwWP3fCJF7cBGRUPiGdGhs'),
          ('COMMUNITY', '8HgsjfVko8jrsi8ZZjZhYFx6arz9X2J9tzzdF2dDnL2A');
      `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "d1c_wallet";');
    await queryRunner.query('DROP TYPE "wallet_type_enum";');
  }
}