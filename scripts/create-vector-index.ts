import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../lib/db/mongodb';
import Service from '../lib/models/Service';
import { AI_CONFIG } from '../lib/config/ai.config';

// Load environment variables
dotenv.config();

/**
 * Create vector search index for MongoDB Atlas
 */
async function createVectorSearchIndex() {
  console.log('🚀 Creating vector search index for MongoDB Atlas...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get the collection
    const collection = Service.collection;

    // Define the vector search index
    const indexDefinition = {
      name: 'vector_index',
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            type: 'vector',
            path: 'embedding',
            numDimensions: AI_CONFIG.EMBEDDING.DIMENSIONS, // 3072 for text-embedding-3-large
            similarity: 'cosine', // cosine, euclidean, or dotProduct
          },
        ],
      },
    };

    console.log('📋 Index Definition:');
    console.log(JSON.stringify(indexDefinition, null, 2));
    console.log('');

    try {
      // Attempt to create the search index
      // Note: This requires MongoDB Atlas and the MongoDB Node.js driver v6.0+
      const result = await collection.createSearchIndex(indexDefinition);

      console.log('✅ Vector search index created successfully!');
      console.log(`   Index Name: ${indexDefinition.name}`);
      console.log(`   Dimensions: ${AI_CONFIG.EMBEDDING.DIMENSIONS}`);
      console.log(`   Similarity: cosine`);
      console.log(`   Result:`, result);
    } catch (error: any) {
      if (error.message?.includes('Atlas Search index already exists')) {
        console.log('ℹ️  Vector search index already exists');
        console.log('   This is fine - your index is already set up!');
      } else if (error.message?.includes('not supported') || error.message?.includes('Atlas')) {
        console.log('\n⚠️  Note: Programmatic index creation requires MongoDB Atlas.');
        console.log('');
        console.log('📝 Please create the index manually via Atlas UI:');
        console.log('');
        console.log('1. Go to Atlas Dashboard → Your Cluster → Browse Collections');
        console.log('2. Select your database → services collection');
        console.log('3. Click "Search Indexes" tab → "Create Search Index"');
        console.log('4. Choose "JSON Editor" and paste this definition:');
        console.log('');
        console.log(JSON.stringify({
          fields: [
            {
              type: 'vector',
              path: 'embedding',
              numDimensions: AI_CONFIG.EMBEDDING.DIMENSIONS,
              similarity: 'cosine',
            },
          ],
        }, null, 2));
        console.log('');
        console.log('5. Name it: vector_index');
        console.log('6. Click "Create Search Index"');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('\n❌ Error creating vector search index:', error);
    throw error;
  } finally {
    await disconnectDB();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
createVectorSearchIndex()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
