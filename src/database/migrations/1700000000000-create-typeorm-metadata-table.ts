import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTypeormMetadataTable1700000000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS "typeorm_metadata" (
                "type" character varying NOT NULL,
                "database" character varying,
                "schema" character varying,
                "table" character varying,
                "name" character varying,
                "value" text
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE IF EXISTS "typeorm_metadata";
        `);
    }
}