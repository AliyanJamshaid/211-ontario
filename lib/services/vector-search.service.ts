import Service, { IService } from '../models/Service';
import { generateEmbedding } from './embedding.service';

export interface VectorSearchOptions {
  limit?: number;
  minScore?: number;
  locations?: string[];
  subtopicIds?: string[];
}

export interface VectorSearchResult {
  service: IService;
  similarity: number;
  rank: number;
}

/**
 * Perform vector search on services using MongoDB Atlas Vector Search
 * @param queryText - The search query text
 * @param options - Search options (limit, minScore, filters)
 * @returns Array of search results with similarity scores
 */
export async function vectorSearchServices(
  queryText: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  const {
    limit = 10,
    minScore = 0.5,
    locations,
    subtopicIds,
  } = options;

  try {
    console.log(`🔍 Starting vector search for: "${queryText}"`);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);
    console.log(`✅ Generated query embedding (${queryEmbedding.length} dimensions)`);

    // Build the vector search pipeline
    const pipeline: any[] = [
      // Step 1: Vector search using the index
      {
        $vectorSearch: {
          index: 'vector_index', // Your vector index name
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(100, limit * 5), // Number of candidates to consider
          limit: limit * 2, // Get more results for filtering
        },
      },
      // Step 2: Add similarity score
      {
        $addFields: {
          similarity: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    // Step 3: Apply filters
    const matchFilters: any = {
      similarity: { $gte: minScore },
    };

    if (locations && locations.length > 0) {
      matchFilters.locations = { $in: locations };
    }

    if (subtopicIds && subtopicIds.length > 0) {
      matchFilters.subtopicIds = { $in: subtopicIds };
    }

    pipeline.push({
      $match: matchFilters,
    });

    // Step 4: Sort by similarity
    pipeline.push({
      $sort: {
        similarity: -1,
      },
    });

    // Step 5: Limit results
    pipeline.push({
      $limit: limit,
    });

    // Execute the aggregation pipeline
    const results = await Service.aggregate(pipeline);

    console.log(`✅ Vector search completed! Found ${results.length} results`);

    // Format results
    const formattedResults: VectorSearchResult[] = results.map((result, index) => ({
      service: result as IService,
      similarity: Math.round(result.similarity * 100) / 100,
      rank: index + 1,
    }));

    // Log top results
    if (formattedResults.length > 0) {
      const top3 = formattedResults
        .slice(0, 3)
        .map(
          (r) =>
            `${r.rank}. ${r.service.name} (similarity: ${r.similarity})`
        );
      console.log(`📊 Top 3 results: ${top3.join('; ')}`);
    }

    return formattedResults;
  } catch (error) {
    console.error('❌ Vector search error:', error);
    throw new Error(
      `Vector search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Perform hybrid search combining vector search with traditional filters
 * @param queryText - The search query text
 * @param options - Search options
 * @returns Array of search results
 */
export async function hybridSearchServices(
  queryText: string,
  options: VectorSearchOptions = {}
): Promise<VectorSearchResult[]> {
  const {
    limit = 10,
    minScore = 0.3, // Lower threshold for hybrid search
    locations,
    subtopicIds,
  } = options;

  try {
    console.log(`🔍 Starting hybrid search for: "${queryText}"`);

    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(queryText);

    // Build hybrid search pipeline
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: queryEmbedding,
          numCandidates: Math.max(200, limit * 10),
          limit: limit * 5,
        },
      },
      {
        $addFields: {
          vectorScore: { $meta: 'vectorSearchScore' },
        },
      },
    ];

    // Apply filters and add text search boost
    const matchFilters: any = {
      vectorScore: { $gte: minScore },
    };

    if (locations && locations.length > 0) {
      matchFilters.locations = { $in: locations };
    }

    if (subtopicIds && subtopicIds.length > 0) {
      matchFilters.subtopicIds = { $in: subtopicIds };
    }

    pipeline.push({ $match: matchFilters });

    // Add text search score (if text index exists)
    pipeline.push({
      $addFields: {
        // Boost score if query terms appear in name or description
        textBoost: {
          $cond: {
            if: {
              $regexMatch: {
                input: { $concat: ['$name', ' ', '$description'] },
                regex: queryText,
                options: 'i',
              },
            },
            then: 0.2,
            else: 0,
          },
        },
      },
    });

    // Calculate final hybrid score
    pipeline.push({
      $addFields: {
        similarity: { $add: ['$vectorScore', '$textBoost'] },
      },
    });

    // Sort and limit
    pipeline.push({ $sort: { similarity: -1 } });
    pipeline.push({ $limit: limit });

    const results = await Service.aggregate(pipeline);

    console.log(`✅ Hybrid search completed! Found ${results.length} results`);

    return results.map((result, index) => ({
      service: result as IService,
      similarity: Math.round(result.similarity * 100) / 100,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('❌ Hybrid search error:', error);
    throw new Error(
      `Hybrid search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Find similar services based on a service ID
 * @param serviceId - The service ID to find similar services for
 * @param limit - Number of similar services to return
 * @returns Array of similar services
 */
export async function findSimilarServices(
  serviceId: string,
  limit: number = 5
): Promise<VectorSearchResult[]> {
  try {
    console.log(`🔍 Finding similar services for: ${serviceId}`);

    // Get the source service
    const sourceService = await Service.findOne({ id: serviceId }).lean();

    if (!sourceService) {
      throw new Error(`Service not found: ${serviceId}`);
    }

    if (!sourceService.embedding || sourceService.embedding.length === 0) {
      throw new Error(`Service ${serviceId} does not have an embedding`);
    }

    // Use the service's embedding to find similar services
    const pipeline: any[] = [
      {
        $vectorSearch: {
          index: 'vector_index',
          path: 'embedding',
          queryVector: sourceService.embedding,
          numCandidates: Math.max(100, limit * 5),
          limit: limit + 1, // +1 to exclude the source service
        },
      },
      {
        $addFields: {
          similarity: { $meta: 'vectorSearchScore' },
        },
      },
      {
        $match: {
          id: { $ne: serviceId }, // Exclude the source service
        },
      },
      {
        $limit: limit,
      },
    ];

    const results = await Service.aggregate(pipeline);

    console.log(`✅ Found ${results.length} similar services`);

    return results.map((result, index) => ({
      service: result as IService,
      similarity: Math.round(result.similarity * 100) / 100,
      rank: index + 1,
    }));
  } catch (error) {
    console.error('❌ Find similar services error:', error);
    throw new Error(
      `Find similar services failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
