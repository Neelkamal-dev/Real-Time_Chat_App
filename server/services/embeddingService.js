import { embeddingModel } from "../config/gemini.js";

/**
 * Generates a vector embedding for the given text query using text-embedding-004.
 * @param {string} text 
 * @returns {Promise<number[]>} - The vector embedding array
 */
export const generateEmbedding = async (text) => {
  try {
    if (!text || typeof text !== "string") {
      throw new Error("Text is required for embedding generation.");
    }
    const cleanText = text.replace(/\n/g, " ");
    const result = await embeddingModel.embedContent(cleanText);
    
    if (result && result.embedding && result.embedding.values) {
      return result.embedding.values;
    }
    throw new Error("Failed to retrieve embedding values from response.");
  } catch (error) {
    console.error("Error generating vector embedding:", error);
    throw error;
  }
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
