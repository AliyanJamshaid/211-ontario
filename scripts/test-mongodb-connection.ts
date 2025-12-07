// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';

async function testConnection() {
  try {
    console.log('🔍 Testing MongoDB connection...\n');

    const MONGODB_URI = process.env.MONGODB_URI || '';
    console.log(`📍 MongoDB URI: ${MONGODB_URI}\n`);

    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in .env file');
    }

    console.log('⏳ Attempting to connect...');

    await mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });

    console.log('✅ MongoDB connected successfully!\n');

    // Test database access
    const collections = await mongoose.connection.db?.listCollections().toArray();
    console.log(`📊 Available collections: ${collections?.length || 0}`);
    if (collections && collections.length > 0) {
      collections.forEach((col) => {
        console.log(`   - ${col.name}`);
      });
    }

    console.log('\n🎉 Connection test passed!');
  } catch (error) {
    console.error('\n❌ Connection test failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Connection closed');
  }
}

testConnection()
  .then(() => {
    console.log('\n✨ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error);
    process.exit(1);
  });
