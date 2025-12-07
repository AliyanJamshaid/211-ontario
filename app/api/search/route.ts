import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { vectorSearchServices, hybridSearchServices } from '@/lib/services/vector-search.service';

/**
 * POST /api/search
 * Semantic search endpoint using vector embeddings
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, limit = 10, minScore = 0.5, locations, subtopicIds, searchType = 'vector' } = body;

    // Validate query
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        {
          success: false,
          error: 'Query is required and must be a non-empty string',
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Search request: "${query}" (limit: ${limit}, minScore: ${minScore})`);

    // Connect to database
    await connectDB();

    // Perform search based on type
    let results;
    if (searchType === 'hybrid') {
      results = await hybridSearchServices(query, {
        limit,
        minScore,
        locations,
        subtopicIds,
      });
    } else {
      results = await vectorSearchServices(query, {
        limit,
        minScore,
        locations,
        subtopicIds,
      });
    }

    console.log(`✅ Found ${results.length} results`);

    return NextResponse.json({
      success: true,
      query,
      results: results.map((r) => ({
        id: r.service.id,
        name: r.service.name,
        subtitle: r.service.subtitle,
        description: r.service.description,
        address: r.service.address,
        website: r.service.website,
        locations: r.service.locations,
        subtopicIds: r.service.subtopicIds,
        details: r.service.details,
        similarity: r.similarity,
        rank: r.rank,
      })),
      totalResults: results.length,
      searchType,
      params: { limit, minScore },
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/search?q=query
 * Alternative GET endpoint for simple searches
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '10');
    const minScore = parseFloat(searchParams.get('minScore') || '0.5');

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: 'Query parameter "q" is required',
        },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Perform vector search
    const results = await vectorSearchServices(query, {
      limit,
      minScore,
    });

    return NextResponse.json({
      success: true,
      query,
      results: results.map((r) => ({
        id: r.service.id,
        name: r.service.name,
        subtitle: r.service.subtitle,
        description: r.service.description,
        address: r.service.address,
        website: r.service.website,
        locations: r.service.locations,
        similarity: r.similarity,
        rank: r.rank,
      })),
      totalResults: results.length,
    });
  } catch (error) {
    console.error('Error in search API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      },
      { status: 500 }
    );
  }
}
