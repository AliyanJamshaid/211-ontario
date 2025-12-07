export const AI_CONFIG = {
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
  },
  MODELS: {
    EMBEDDING: 'text-embedding-3-large', // Using large model for better results
    EMBEDDING_SMALL: 'text-embedding-3-small',
    EMBEDDING_LARGE: 'text-embedding-3-large',
  },
  EMBEDDING: {
    ENCODING_FORMAT: 'float',
    DIMENSIONS: 3072, // Dimensions for text-embedding-3-large
    DIMENSIONS_SMALL: 1536, // Dimensions for text-embedding-3-small
  },
} as const;
