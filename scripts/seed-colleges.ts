import { AppDataSource } from '../data-source';
import { College } from '../src/college/entities/college.entity';
import * as fs from 'fs';
import * as path from 'path';

interface SchoolData {
  schoolName: string;
  commonName: string;
  nickname: string;
  city: string;
  state: string;
  type: string;
  subdivision: string;
  primary: string;
  walletAddress: string;
  logo: string;
}

async function seedColleges() {
  try {
    // Initialize database connection
    await AppDataSource.initialize();
    console.log('Database connection established');

    // Read schools data
    const schoolsPath = path.join(__dirname, '../src/data/schools.json');
    const schoolsData: SchoolData[] = JSON.parse(fs.readFileSync(schoolsPath, 'utf8'));
    
    console.log(`Found ${schoolsData.length} schools to process`);

    // Get college repository
    const collegeRepository = AppDataSource.getRepository(College);

    // Check if colleges already exist
    const existingCount = await collegeRepository.count();
    if (existingCount > 0) {
      console.log(`Found ${existingCount} existing colleges. Do you want to continue? (This will add duplicates)`);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process each school
    for (const school of schoolsData) {
      try {
        // Check if college already exists by wallet address
        const existingCollege = await collegeRepository.findOne({
          where: { walletAddress: school.walletAddress }
        });

        if (existingCollege) {
          console.log(`College with wallet ${school.walletAddress} already exists, skipping...`);
          continue;
        }

        // Create new college
        const college = collegeRepository.create({
          name: school.schoolName,
          commonName: school.commonName,
          nickname: school.nickname,
          city: school.city,
          state: school.state,
          type: school.type,
          subdivision: school.subdivision,
          primary: school.primary,
          walletAddress: school.walletAddress,
          logo: school.logo || null,
        });

        await collegeRepository.save(college);
        successCount++;
        
        if (successCount % 10 === 0) {
          console.log(`Processed ${successCount} colleges...`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = `Error processing ${school.schoolName}: ${error.message}`;
        errors.push(errorMessage);
        console.error(errorMessage);
      }
    }

    console.log('\n=== Seeding Complete ===');
    console.log(`Successfully added: ${successCount} colleges`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(error => console.log(`- ${error}`));
    }

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    // Close database connection
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Database connection closed');
    }
    process.exit(0);
  }
}

// Run the seeding function
seedColleges(); 