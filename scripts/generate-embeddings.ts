import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../lib/db/mongodb';
import Service from '../lib/models/Service';
import { generateComprehensiveServiceEmbedding } from '../lib/services/embedding.service';
import { AI_CONFIG } from '../lib/config/ai.config';

// Load environment variables
dotenv.config();

/**
 * Generate embeddings for all services in the database
 */
async function generateEmbeddings() {
  console.log('🚀 Starting embedding generation process...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Connected to MongoDB\n');

    // Get total count of services
    const totalServices = await Service.countDocuments();
    console.log(`📊 Total services in database: ${totalServices}\n`);

    if (totalServices === 0) {
      console.log('⚠️  No services found in database. Please import services first.');
      return;
    }

    // Check how many services already have embeddings
    const servicesWithEmbeddings = await Service.countDocuments({
      embedding: { $exists: true, $ne: null, $type: 'array' },
    });
    console.log(`✨ Services with existing embeddings: ${servicesWithEmbeddings}`);
    console.log(`🔄 Services needing embeddings: ${totalServices - servicesWithEmbeddings}\n`);

    // Ask user if they want to regenerate all or only missing
    const shouldRegenerateAll = process.argv.includes('--force') || process.argv.includes('--all');

    if (shouldRegenerateAll) {
      console.log('🔄 Mode: Regenerating ALL embeddings (--force flag detected)\n');
    } else {
      console.log('🔄 Mode: Generating embeddings only for services without them\n');
      console.log('💡 Tip: Use --force or --all flag to regenerate all embeddings\n');
    }

    // Build query based on mode
    const query = shouldRegenerateAll ? {} : {
      $or: [
        { embedding: { $exists: false } },
        { embedding: null },
        { embedding: { $size: 0 } },
      ],
    };

    // Get services that need embeddings
    const services = await Service.find(query).lean();
    console.log(`📝 Processing ${services.length} services...\n`);

    if (services.length === 0) {
      console.log('✅ All services already have embeddings!');
      return;
    }

    // Process services in batches to avoid rate limits
    const BATCH_SIZE = 10;
    const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ id: string; name: string; error: string }> = [];

    console.log(`⚙️  Configuration:`);
    console.log(`   - Model: ${AI_CONFIG.MODELS.EMBEDDING}`);
    console.log(`   - Dimensions: ${AI_CONFIG.EMBEDDING.DIMENSIONS}`);
    console.log(`   - Batch size: ${BATCH_SIZE}`);
    console.log(`   - Delay between batches: ${DELAY_BETWEEN_BATCHES}ms\n`);

    // Estimate cost
    const estimatedTokensPerService = 500;
    const totalEstimatedTokens = services.length * estimatedTokensPerService;
    const estimatedCost = (totalEstimatedTokens / 1_000_000) * 0.13;
    console.log(`💰 Estimated cost: $${estimatedCost.toFixed(4)} USD\n`);

    console.log('─'.repeat(60));
    console.log('Starting generation...\n');

    for (let i = 0; i < services.length; i += BATCH_SIZE) {
      const batch = services.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(services.length / BATCH_SIZE);

      console.log(`📦 Processing batch ${batchNumber}/${totalBatches} (services ${i + 1}-${Math.min(i + BATCH_SIZE, services.length)})...`);

      // Process batch
      const batchPromises = batch.map(async (service) => {
        try {
          // Generate comprehensive embedding
          const embedding = await generateComprehensiveServiceEmbedding({
            id: service.id,
            name: service.name,
            subtitle: service.subtitle,
            description: service.description,
            address: service.address,
            phone: service.phone,
            website: service.website,
            locations: service.locations,
            details: service.details,
          });

          // Update service with embedding
          await Service.updateOne(
            { id: service.id },
            {
              $set: {
                embedding: embedding,
                embeddingModel: AI_CONFIG.MODELS.EMBEDDING,
              },
            }
          );

          successCount++;
          console.log(`   ✅ ${service.name.substring(0, 50)}... (${embedding.length} dimensions)`);
          return { success: true, id: service.id };
        } catch (error) {
          errorCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.log(`   ❌ ${service.name.substring(0, 50)}... - Error: ${errorMessage}`);
          errors.push({
            id: service.id,
            name: service.name,
            error: errorMessage,
          });
          return { success: false, id: service.id, error: errorMessage };
        }
      });

      await Promise.all(batchPromises);

      // Add delay between batches to avoid rate limits
      if (i + BATCH_SIZE < services.length) {
        console.log(`   ⏸️  Waiting ${DELAY_BETWEEN_BATCHES}ms before next batch...\n`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 Generation Summary:');
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📈 Success rate: ${((successCount / services.length) * 100).toFixed(2)}%`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((err) => {
        console.log(`   - ${err.name} (${err.id}): ${err.error}`);
      });
    }

    // Verify final count
    const finalCount = await Service.countDocuments({
      embedding: { $exists: true, $ne: null, $type: 'array' },
    });
    console.log(`\n✨ Total services with embeddings: ${finalCount}/${totalServices}`);

    console.log('\n✅ Embedding generation complete!');
  } catch (error) {
    console.error('\n❌ Error in embedding generation:', error);
    throw error;
  } finally {
    await disconnectDB();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

// Run the script
generateEmbeddings()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
