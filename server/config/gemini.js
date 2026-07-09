import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("WARNING: GEMINI_API_KEY is not defined in the environment variables.");
}

export const genAI = new GoogleGenerativeAI(apiKey || "dummy_key");

// Models configured for production tasks
export const geminiModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});
