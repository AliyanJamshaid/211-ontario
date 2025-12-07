#!/usr/bin/env node

// ========================================
// 📋 EASY CONTROLS - CONFIGURE YOUR SEARCH
// ========================================
const SEARCH_CONFIG = {
  // Input themes for RAG search (modify these to get different results)
  contentThemes: [
    "AI artificial intelligence machine learning",
    // "startup entrepreneurship business growth",
    // "productivity personal development",
  ],

  // Search parameters
  limit: 3, // Number of posts to retrieve
  minScore: 0.1, // Minimum similarity score (0-1, lower = more permissive)
  source: "linkedin", // Platform: "linkedin" or "twitter"

  // Atlas Vector Search settings
  vectorIndexName: "embedding_vector_search", // Vector search index name

  // Output settings
  outputFile: "retrieved-posts.json", // JSON output file
  markdownFile: "retrieved-posts.md", // Human-readable markdown file

  // Filters
  onlyExternalCreators: true, // Only posts from external creators (not your own)
  minEngagement: 0, // Minimum total engagement (reactions + comments + shares)
};

// ========================================
// 📦 DEPENDENCIES & SETUP
// ========================================
const path = require("path");
const fs = require("fs").promises;
const mongoose = require("mongoose");

// Database connection
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const connectMongo = require("../src/utils/database");

// Import services and models
const { OpenAI } = require("openai");
const Content = require("../src/shared/models/content.model");
const logger = require("../src/utils/PrettyLogger");
const { AI_CONFIG } = require("../src/config/ai.config");

// ========================================
// 🤖 CUSTOM EMBEDDING & RAG FUNCTIONS
// ========================================

// Initialize OpenAI client
let openaiClient = null;
const getOpenAIClient = () => {
  if (!openaiClient) {
    if (!AI_CONFIG.OPENAI.API_KEY) {
      throw new Error("OPENAI_API_KEY is required for embedding service");
    }
    openaiClient = new OpenAI({
      apiKey: AI_CONFIG.OPENAI.API_KEY,
    });
  }
  return openaiClient;
};

// Generate embedding for text
async function generateEmbedding(text, model = AI_CONFIG.MODELS.EMBEDDING) {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text input is required and must be a string");
    }

    const openai = getOpenAIClient();
    const response = await openai.embeddings.create({
      model: model,
      input: text,
      encoding_format: AI_CONFIG.EMBEDDING.ENCODING_FORMAT,
    });

    const embedding = response.data[0].embedding;
    logger.info(
      `Generated embedding for text (${text.length} chars) using model: ${model}`
    );
    return embedding;
  } catch (error) {
    logger.error("Error generating embedding:", error.message);
    throw error;
  }
}

// Atlas Vector Search function (no fallback)
async function searchSimilarPosts(queryText, options = {}) {
  const { limit = 20, minScore = 0.3, source = "linkedin" } = options;

  try {
    logger.info(`🔍 Starting Atlas Vector Search for: "${queryText}"`);

    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(queryText);

    logger.info("🚀 Using Atlas Vector Search (optimized)");

    const vectorPipeline = [
      {
        $vectorSearch: {
          index: SEARCH_CONFIG.vectorIndexName,
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: Math.max(100, limit * 5),
          limit: limit * 2,
        },
      },
      {
        $addFields: {
          similarity: { $meta: "vectorSearchScore" },
        },
      },
      {
        $match: {
          similarity: { $gte: minScore },
          source: source,
          isExternalCreator: true,
        },
      },
      {
        $sort: {
          similarity: -1,
          "engagement.reactions": -1,
        },
      },
      {
        $limit: limit,
      },
      {
        $project: {
          content: 1,
          hook: 1,
          creator: 1,
          url: 1,
          postedAt: 1,
          similarity: 1,
          engagement: {
            reactions: 1,
            comments: 1,
            shares: 1,
            multiplier: 1,
            totalEngagement: {
              $add: [
                { $ifNull: ["$engagement.reactions", 0] },
                { $ifNull: ["$engagement.comments", 0] },
                { $ifNull: ["$engagement.shares", 0] },
              ],
            },
          },
        },
      },
    ];

    const similarPosts = await Content.aggregate(vectorPipeline);
    logger.success(
      `✅ Atlas Vector Search succeeded! Found ${similarPosts.length} similar posts`
    );

    // Format results
    const formattedPosts = similarPosts.map((post, index) => ({
      rank: index + 1,
      similarity: Math.round(post.similarity * 100) / 100,
      hook: post.hook || "No hook available",
      content: post.content,
      creator: post.creator || "Unknown",
      engagement: {
        reactions: post.engagement?.reactions || 0,
        comments: post.engagement?.comments || 0,
        shares: post.engagement?.shares || 0,
        total: post.engagement?.totalEngagement || 0,
        multiplier: post.engagement?.multiplier || 0,
      },
      url: post.url,
      postedAt: post.postedAt,
    }));

    if (formattedPosts.length > 0) {
      const top3 = formattedPosts
        .slice(0, 3)
        .map(
          (post, i) =>
            `${i + 1}. Similarity: ${post.similarity}, Creator: ${post.creator}`
        );
      logger.info(`📊 Top 3 results: ${top3.join("; ")}`);
    }

    return {
      success: true,
      posts: formattedPosts,
      query: queryText,
      totalFound: formattedPosts.length,
      searchParams: { limit, minScore, source },
      searchMethod: "Atlas Vector Search",
    };
  } catch (error) {
    logger.error("❌ RAG search error:", error);
    throw new Error(`RAG search failed: ${error.message}`);
  }
}

// ========================================
// 🔍 MAIN RAG RETRIEVAL FUNCTION
// ========================================
async function retrievePostsWithRAG() {
  try {
    logger.info("🚀 Starting RAG-based post retrieval...");
    logger.info("Search Config:", SEARCH_CONFIG);

    // Combine content themes into single query
    const queryText = SEARCH_CONFIG.contentThemes.join(" ");
    logger.info(`📝 Combined query: "${queryText}"`);

    // Retrieve posts using our custom RAG
    const ragResult = await searchSimilarPosts(queryText, {
      limit: SEARCH_CONFIG.limit,
      minScore: SEARCH_CONFIG.minScore,
      source: SEARCH_CONFIG.source,
    });

    let retrievedPosts = ragResult.success ? ragResult.posts : [];
    logger.info(
      `✅ RAG retrieved ${retrievedPosts.length} posts with embeddings (Atlas Vector Search)`
    );

    // Apply engagement filter
    if (SEARCH_CONFIG.minEngagement > 0) {
      const beforeCount = retrievedPosts.length;
      retrievedPosts = retrievedPosts.filter(
        (post) => post.engagement.total >= SEARCH_CONFIG.minEngagement
      );
      logger.info(
        `🎯 Filtered by engagement: ${beforeCount} → ${retrievedPosts.length} posts`
      );
    }

    // Save results to files
    await saveResults(retrievedPosts, ragResult);

    logger.success(`🎉 Retrieved and saved ${retrievedPosts.length} posts!`);
    logger.info(
      `📁 Files saved: ${SEARCH_CONFIG.outputFile}, ${SEARCH_CONFIG.markdownFile}`
    );

    return retrievedPosts;
  } catch (error) {
    logger.error("❌ Error in RAG retrieval:", error);
    throw error;
  }
}

// ========================================
// 💾 SAVE RESULTS TO FILES
// ========================================
async function saveResults(posts, ragResult) {
  const scriptsDir = __dirname;

  // Prepare metadata
  const metadata = {
    timestamp: new Date().toISOString(),
    searchConfig: SEARCH_CONFIG,
    ragQuery: ragResult.query || null,
    totalRetrieved: posts.length,
    searchParams: ragResult.searchParams || {},
    searchMethod: ragResult.searchMethod || "unknown",
  };

  // Save JSON file
  const jsonOutput = {
    metadata,
    posts,
  };

  const jsonPath = path.join(scriptsDir, SEARCH_CONFIG.outputFile);
  await fs.writeFile(jsonPath, JSON.stringify(jsonOutput, null, 2), "utf8");

  // Save Markdown file
  const markdownContent = generateMarkdownReport(posts, metadata);
  const markdownPath = path.join(scriptsDir, SEARCH_CONFIG.markdownFile);
  await fs.writeFile(markdownPath, markdownContent, "utf8");

  logger.info(`📄 Saved JSON: ${jsonPath}`);
  logger.info(`📝 Saved Markdown: ${markdownPath}`);
}

// ========================================
// 📝 GENERATE MARKDOWN REPORT
// ========================================
function generateMarkdownReport(posts, metadata) {
  let markdown = `# RAG Post Retrieval Report\n\n`;

  markdown += `**Generated:** ${new Date(
    metadata.timestamp
  ).toLocaleString()}\n`;
  markdown += `**Total Posts Retrieved:** ${metadata.totalRetrieved}\n`;
  markdown += `**Search Themes:** ${metadata.searchConfig.contentThemes.join(
    ", "
  )}\n`;
  markdown += `**Minimum Similarity:** ${metadata.searchConfig.minScore}\n`;
  markdown += `**Source:** ${metadata.searchConfig.source}\n`;
  markdown += `**Search Method:** ${metadata.searchMethod}\n\n`;

  if (metadata.ragQuery) {
    markdown += `**Combined Query:** ${metadata.ragQuery}\n\n`;
  }

  markdown += `## Retrieved Posts\n\n`;

  posts.forEach((post, index) => {
    markdown += `### Post ${index + 1}\n`;

    if (typeof post.similarity === "number") {
      markdown += `**Similarity Score:** ${post.similarity}\n`;
    } else {
      markdown += `**Similarity Score:** ${post.similarity}\n`;
    }

    markdown += `**Creator:** ${post.creator}\n`;
    markdown += `**Engagement:** ${post.engagement.total} total (${post.engagement.reactions} reactions, ${post.engagement.comments} comments, ${post.engagement.shares} shares)\n`;

    if (post.engagement.multiplier && post.engagement.multiplier !== "0") {
      markdown += `**Multiplier:** ${post.engagement.multiplier}\n`;
    }

    if (post.url) {
      markdown += `**URL:** [View Post](${post.url})\n`;
    }

    if (post.postedAt) {
      markdown += `**Posted:** ${new Date(
        post.postedAt
      ).toLocaleDateString()}\n`;
    }

    markdown += `\n**Hook:**\n${post.hook}\n\n`;
    markdown += `**Content:**\n${post.content}\n\n`;
    markdown += `---\n\n`;
  });

  return markdown;
}

// ========================================
// 🏁 RUN THE SCRIPT
// ========================================
async function main() {
  try {
    // Connect to database
    logger.info("🔗 Connecting to database...");
    await connectMongo();
    logger.info("📊 Database connected, starting RAG retrieval...");

    const posts = await retrievePostsWithRAG();

    // Print summary
    console.log("\n" + "=".repeat(50));
    console.log("🎯 RAG RETRIEVAL SUMMARY");
    console.log("=".repeat(50));
    console.log(`✅ Posts retrieved: ${posts.length}`);
    console.log(
      `📁 Files created: ${SEARCH_CONFIG.outputFile}, ${SEARCH_CONFIG.markdownFile}`
    );
    console.log(`🔍 Search themes: ${SEARCH_CONFIG.contentThemes.join(", ")}`);
    console.log("=".repeat(50));
  } catch (error) {
    logger.error("❌ Script failed:", error);
    process.exit(1);
  } finally {
    // Close database connection
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { retrievePostsWithRAG, SEARCH_CONFIG };
