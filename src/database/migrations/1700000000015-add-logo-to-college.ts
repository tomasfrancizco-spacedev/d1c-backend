import { MigrationInterface, QueryRunner } from 'typeorm';

export class addLogoToCollege1700000000015 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if logo column already exists
    const logoColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'college' AND column_name = 'logo';
    `);

    if (logoColumnExists.length === 0) {
      // Add logo column to college table
      await queryRunner.query(`
        ALTER TABLE college 
        ADD COLUMN "logo" varchar(500) NULL;
      `);
      console.log('✅ Added logo column to college table');
    } else {
      console.log('ℹ️  Logo column already exists in college table, skipping creation');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if logo column exists before dropping
    const logoColumnExists = await queryRunner.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'college' AND column_name = 'logo';
    `);

    if (logoColumnExists.length > 0) {
      // Remove logo column
      await queryRunner.query(`
        ALTER TABLE college 
        DROP COLUMN "logo";
      `);
      console.log('✅ Removed logo column from college table');
    } else {
      console.log('ℹ️  Logo column does not exist, skipping removal');
    }
  }
}