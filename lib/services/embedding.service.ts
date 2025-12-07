import OpenAI from 'openai';
import { AI_CONFIG } from '../config/ai.config';

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
const getOpenAIClient = (): OpenAI => {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY || AI_CONFIG.OPENAI.API_KEY;

    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for embedding service');
    }

    openaiClient = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openaiClient;
};

/**
 * Generate embedding for a given text
 * @param text - The text to generate embedding for
 * @param model - The OpenAI embedding model to use
 * @returns Array of numbers representing the embedding
 */
export const generateEmbedding = async (
  text: string,
  model: string = AI_CONFIG.MODELS.EMBEDDING
): Promise<number[]> => {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error('Text input is required and must be a string');
    }

    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: model,
      input: text,
      encoding_format: AI_CONFIG.EMBEDDING.ENCODING_FORMAT,
    });

    const embedding = response.data[0].embedding;

    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
};

/**
 * Generate embedding for a service headline/title
 * @param headline - The headline text to embed
 * @returns Array of numbers representing the embedding, or null on error
 */
export const generateHeadlineEmbedding = async (
  headline: string
): Promise<number[] | null> => {
  try {
    if (!headline || typeof headline !== 'string' || headline.trim() === '') {
      return null;
    }

    // Clean and prepare headline text
    const cleanHeadline = headline.trim();

    // Generate embedding using the standard model
    const embedding = await generateEmbedding(cleanHeadline);

    return embedding;
  } catch (error) {
    console.error('Error generating headline embedding:', error);
    return null; // Return null on error instead of throwing
  }
};

/**
 * Generate embeddings for multiple texts in batch
 * @param texts - Array of texts to generate embeddings for
 * @param model - The OpenAI embedding model to use
 * @returns Array of embeddings
 */
export const generateBatchEmbeddings = async (
  texts: string[],
  model: string = AI_CONFIG.MODELS.EMBEDDING
): Promise<number[][]> => {
  try {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Texts input is required and must be a non-empty array');
    }

    // Filter out empty texts
    const validTexts = texts.filter(
      (text) => text && typeof text === 'string' && text.trim() !== ''
    );

    if (validTexts.length === 0) {
      throw new Error('No valid texts provided for embedding');
    }

    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: model,
      input: validTexts,
      encoding_format: AI_CONFIG.EMBEDDING.ENCODING_FORMAT,
    });

    const embeddings = response.data.map((item) => item.embedding);

    return embeddings;
  } catch (error) {
    console.error('Error generating batch embeddings:', error);
    throw error;
  }
};

/**
 * Generate embedding for service data (combines name, subtitle, description)
 * @param service - Service object with name, subtitle, and description
 * @returns Array of numbers representing the embedding
 */
export const generateServiceEmbedding = async (service: {
  name: string;
  subtitle?: string;
  description?: string;
}): Promise<number[]> => {
  try {
    // Combine relevant service fields for embedding
    const textParts: string[] = [];

    if (service.name) textParts.push(service.name);
    if (service.subtitle) textParts.push(service.subtitle);
    if (service.description) {
      // Strip HTML tags from description
      const cleanDescription = service.description.replace(/<[^>]*>/g, ' ').trim();
      textParts.push(cleanDescription);
    }

    const combinedText = textParts.join(' ').trim();

    if (!combinedText) {
      throw new Error('No valid text found in service data');
    }

    return await generateEmbedding(combinedText);
  } catch (error) {
    console.error('Error generating service embedding:', error);
    throw error;
  }
};

/**
 * Helper function to clean HTML and extract text
 */
const cleanHTML = (html: string | undefined): string => {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
};

/**
 * Generate comprehensive embedding for service data including ALL fields
 * This creates a rich embedding that includes all available service information
 * @param service - Complete service object with all fields
 * @returns Array of numbers representing the embedding
 */
export const generateComprehensiveServiceEmbedding = async (service: {
  id?: string;
  name: string;
  subtitle?: string;
  description?: string;
  address?: string;
  phone?: string;
  website?: string;
  locations?: string[];
  details?: {
    fullDescription?: string;
    eligibility?: string;
    applicationProcess?: string;
    documentsRequired?: string;
    mailingAddress?: string;
    languages?: string;
    fees?: string;
    accessibility?: string;
    hoursOfOperation?: string;
    serviceAreas?: string;
  };
}): Promise<number[]> => {
  try {
    const textParts: string[] = [];

    // Core service information (highest priority)
    if (service.name) {
      textParts.push(`Service Name: ${service.name}`);
    }

    if (service.subtitle) {
      textParts.push(`Subtitle: ${service.subtitle}`);
    }

    // Description (very important for search)
    if (service.description) {
      const cleanDesc = cleanHTML(service.description);
      if (cleanDesc) {
        textParts.push(`Description: ${cleanDesc}`);
      }
    }

    // Location information
    if (service.address) {
      textParts.push(`Address: ${service.address}`);
    }

    if (service.locations && service.locations.length > 0) {
      textParts.push(`Locations: ${service.locations.join(', ')}`);
    }

    // Contact information
    if (service.phone) {
      textParts.push(`Phone: ${service.phone}`);
    }

    // Detailed information from details object
    if (service.details) {
      const { details } = service;

      if (details.fullDescription) {
        const cleanFullDesc = cleanHTML(details.fullDescription);
        if (cleanFullDesc) {
          textParts.push(`Full Description: ${cleanFullDesc}`);
        }
      }

      if (details.eligibility) {
        const cleanEligibility = cleanHTML(details.eligibility);
        if (cleanEligibility) {
          textParts.push(`Eligibility: ${cleanEligibility}`);
        }
      }

      if (details.applicationProcess) {
        const cleanProcess = cleanHTML(details.applicationProcess);
        if (cleanProcess) {
          textParts.push(`Application Process: ${cleanProcess}`);
        }
      }

      if (details.documentsRequired) {
        const cleanDocs = cleanHTML(details.documentsRequired);
        if (cleanDocs) {
          textParts.push(`Documents Required: ${cleanDocs}`);
        }
      }

      if (details.languages) {
        const cleanLangs = cleanHTML(details.languages);
        if (cleanLangs) {
          textParts.push(`Languages: ${cleanLangs}`);
        }
      }

      if (details.fees) {
        const cleanFees = cleanHTML(details.fees);
        if (cleanFees) {
          textParts.push(`Fees: ${cleanFees}`);
        }
      }

      if (details.accessibility) {
        const cleanAccessibility = cleanHTML(details.accessibility);
        if (cleanAccessibility) {
          textParts.push(`Accessibility: ${cleanAccessibility}`);
        }
      }

      if (details.hoursOfOperation) {
        const cleanHours = cleanHTML(details.hoursOfOperation);
        if (cleanHours) {
          textParts.push(`Hours: ${cleanHours}`);
        }
      }

      if (details.serviceAreas) {
        const cleanAreas = cleanHTML(details.serviceAreas);
        if (cleanAreas) {
          textParts.push(`Service Areas: ${cleanAreas}`);
        }
      }

      if (details.mailingAddress) {
        const cleanMailAddr = cleanHTML(details.mailingAddress);
        if (cleanMailAddr) {
          textParts.push(`Mailing Address: ${cleanMailAddr}`);
        }
      }
    }

    // Combine all text parts
    const combinedText = textParts.join('\n').trim();

    if (!combinedText) {
      throw new Error('No valid text found in service data');
    }

    // Log the combined text length for debugging
    console.log(`Generating embedding for service ${service.id || service.name} (${combinedText.length} chars)`);

    return await generateEmbedding(combinedText);
  } catch (error) {
    console.error('Error generating comprehensive service embedding:', error);
    throw error;
  }
};
