// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import Service from '../lib/models/Service';
import connectDB from '../lib/db/mongodb';

interface EnrichedServiceData {
  mergedAt: string;
  locations: string[];
  totalUniqueServices: number;
  stats: {
    servicesInBothLocations: number;
    servicesOnlyInHalton: number;
    servicesOnlyInMississauga: number;
  };
  services: any[];
}

async function importServicesToMongoDB() {
  try {
    console.log('🚀 Starting MongoDB import process...\n');

    // Connect to MongoDB
    await connectDB();

    // Read the enriched services JSON file
    const filePath = path.join(process.cwd(), 'data', 'enriched_services.json');
    console.log(`📂 Reading file: ${filePath}`);

    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data: EnrichedServiceData = JSON.parse(fileContent);

    console.log(`\n📊 Data Statistics:`);
    console.log(`   Total unique services: ${data.totalUniqueServices}`);
    console.log(`   Services in both locations: ${data.stats.servicesInBothLocations}`);
    console.log(`   Services only in Halton: ${data.stats.servicesOnlyInHalton}`);
    console.log(`   Services only in Mississauga: ${data.stats.servicesOnlyInMississauga}`);
    console.log(`   Data merged at: ${data.mergedAt}\n`);

    // Clear existing services
    console.log('🗑️  Clearing existing services from database...');
    const deleteResult = await Service.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing services\n`);

    // Prepare services for insertion
    console.log('📝 Preparing services for insertion...');
    const services = data.services.map((service) => ({
      id: service.id,
      name: service.name,
      subtitle: service.subtitle || '',
      description: service.description || '',
      address: service.address || '',
      website: service.website || '',
      subtopicIds: service.subtopicIds || [],
      locations: service.locations || [],
      details: service.details || {},
    }));

    // Batch insert services
    console.log(`💾 Inserting ${services.length} services into MongoDB...`);

    const batchSize = 100;
    let insertedCount = 0;

    for (let i = 0; i < services.length; i += batchSize) {
      const batch = services.slice(i, i + batchSize);
      await Service.insertMany(batch, { ordered: false });
      insertedCount += batch.length;

      const progress = Math.round((insertedCount / services.length) * 100);
      process.stdout.write(`\r   Progress: ${insertedCount}/${services.length} (${progress}%)`);
    }

    console.log('\n\n✅ Import completed successfully!');
    console.log(`\n📈 Final Statistics:`);

    // Verify the import
    const totalInDB = await Service.countDocuments();
    const haltonCount = await Service.countDocuments({ locations: 'Halton' });
    const mississaugaCount = await Service.countDocuments({ locations: 'Mississauga' });
    const bothLocationsCount = await Service.countDocuments({
      locations: { $all: ['Halton', 'Mississauga'] },
    });

    console.log(`   Total services in database: ${totalInDB}`);
    console.log(`   Services in Halton: ${haltonCount}`);
    console.log(`   Services in Mississauga: ${mississaugaCount}`);
    console.log(`   Services in both locations: ${bothLocationsCount}`);

    // Sample service
    const sampleService = await Service.findOne();
    if (sampleService) {
      console.log(`\n📄 Sample service:`);
      console.log(`   ID: ${sampleService.id}`);
      console.log(`   Name: ${sampleService.name}`);
      console.log(`   Locations: ${sampleService.locations.join(', ')}`);
    }

    console.log('\n🎉 All done!');
  } catch (error) {
    console.error('\n❌ Error during import:', error);
    throw error;
  } finally {
    // Close MongoDB connection
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the import
importServicesToMongoDB()
  .then(() => {
    console.log('\n✨ Import script finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Import script failed:', error);
    process.exit(1);
  });
