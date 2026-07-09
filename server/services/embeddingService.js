import { embeddingModel, config } from "../config/gemini.js";
import { validateSearch } from "./responseValidator.js";
import { logAIRequest } from "./aiLogger.js";

/**
 * Generates a vector embedding for the given text query with validation retries and request logging.
 * @param {string} text 
 * @returns {Promise<number[]>} - The vector embedding array (or fallback zero-vector)
 */
export const generateEmbedding = async (text) => {
  if (!text || typeof text !== "string") {
    return new Array(768).fill(0);
  }

  const cleanText = text.replace(/\n/g, " ");
  let attempts = 0;
  const maxAttempts = 2;
  const startTime = Date.now();

  while (attempts < maxAttempts) {
    try {
      const result = await embeddingModel.embedContent(cleanText);
      if (result && result.embedding && result.embedding.values) {
        const values = result.embedding.values;
        const validation = validateSearch(values);
        if (validation.isValid) {
          logAIRequest({
            modelName: config.embeddingModelName,
            responseTimeMs: Date.now() - startTime,
            tokensCount: Math.ceil(cleanText.length / 4),
            success: true,
          });
          return validation.data;
        }
        console.warn(`Embedding validation failed (attempt ${attempts + 1}/2):`, validation.error);
      }
    } catch (error) {
      console.error(`Error generating vector embedding (attempt ${attempts + 1}/2):`, error.message);
      if (attempts === maxAttempts - 1) {
        logAIRequest({
          modelName: config.embeddingModelName,
          responseTimeMs: Date.now() - startTime,
          tokensCount: Math.ceil(cleanText.length / 4),
          success: false,
          errorMessage: error.message,
        });
      }
    }
    attempts++;
  }

  // Graceful fallback: return a 768-dimension zero-vector to prevent math or application crashes
  return new Array(768).fill(0);
};

/**
 * Computes the cosine similarity score between two float vectors.
 * @param {number[]} vecA 
 * @param {number[]} vecB 
 * @returns {number} - Similarity score between -1 and 1
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
};
