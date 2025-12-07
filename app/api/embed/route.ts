import { NextRequest, NextResponse } from 'next/server';
import {
  generateEmbedding,
  generateBatchEmbeddings,
  generateServiceEmbedding,
} from '@/lib/services/embedding.service';

/**
 * POST /api/embed
 * Generate embeddings for text or service data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Single text embedding
    if (body.text && typeof body.text === 'string') {
      const embedding = await generateEmbedding(body.text, body.model);
      return NextResponse.json({
        success: true,
        embedding,
        dimensions: embedding.length,
      });
    }

    // Batch text embeddings
    if (body.texts && Array.isArray(body.texts)) {
      const embeddings = await generateBatchEmbeddings(body.texts, body.model);
      return NextResponse.json({
        success: true,
        embeddings,
        count: embeddings.length,
        dimensions: embeddings[0]?.length || 0,
      });
    }

    // Service data embedding
    if (body.service && typeof body.service === 'object') {
      const embedding = await generateServiceEmbedding(body.service);
      return NextResponse.json({
        success: true,
        embedding,
        dimensions: embedding.length,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Invalid request. Provide either "text", "texts", or "service" in the request body.',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in embed API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate embedding',
      },
      { status: 500 }
    );
  }
}
