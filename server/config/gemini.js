import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables. AI features will fail at runtime.");
}

// Configuration options loaded from environment with safe default fallbacks
export const config = {
  apiKey: apiKey || "dummy_key",
  modelName: process.env.MODEL_NAME || "gemini-1.5-flash",
  embeddingModelName: process.env.EMBEDDING_MODEL || "text-embedding-004",
  maxHistory: parseInt(process.env.MAX_HISTORY, 10) || 10,
  temperature: parseFloat(process.env.TEMPERATURE) || 0.4,
  maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS, 10) || 1024,
};

// Singleton SDK Client Instance
export const genAI = new GoogleGenerativeAI(config.apiKey);

// Model singletons configured with temperature and output constraints
export const geminiModel = genAI.getGenerativeModel({
  model: config.modelName,
  generationConfig: {
    temperature: config.temperature,
    maxOutputTokens: config.maxOutputTokens,
  },
});

export const embeddingModel = genAI.getGenerativeModel({
  model: config.embeddingModelName,
});

export default {
  genAI,
  config,
  geminiModel,
  embeddingModel,
};
