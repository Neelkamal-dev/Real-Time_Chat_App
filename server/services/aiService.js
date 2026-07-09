import { geminiModel } from "../config/gemini.js";
import { getSmartReplyPrompt } from "../prompts/smartReplyPrompt.js";
import { getRewritePrompt } from "../prompts/rewritePrompt.js";
import { getSummaryPrompt } from "../prompts/summaryPrompt.js";
import { getTranscriptionPrompt } from "../prompts/transcriptionPrompt.js";

/**
 * Generates 3-5 smart reply suggestions from conversation context.
 * @param {Array} messagesContext 
 * @returns {Promise<string[]>}
 */
export const generateSmartReplies = async (messagesContext) => {
  try {
    const prompt = getSmartReplyPrompt(messagesContext);
    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text().trim();

    // Clean up markdown block wraps if model included them
    const cleanText = responseText.replace(/```json|```/g, "").trim();
    try {
      const suggestions = JSON.parse(cleanText);
      if (Array.isArray(suggestions)) return suggestions;
    } catch (e) {
      console.warn("JSON parsing failed, attempting fallback regex extraction on smart reply:", responseText);
      // Fallback matching list elements
      const matches = [...cleanText.matchAll(/"([^"]+)"/g)];
      if (matches.length > 0) {
        return matches.map((m) => m[1]).slice(0, 5);
      }
    }
    return ["Okay", "Sure", "I will get back to you soon."];
  } catch (error) {
    console.error("Error generating smart replies:", error);
    return ["Okay", "Sure", "Let me check."];
  }
};

/**
 * Rewrites text to match a target tone.
 * @param {string} text 
 * @param {string} tone 
 * @returns {Promise<string>}
 */
export const rewriteText = async (text, tone) => {
  try {
    const prompt = getRewritePrompt(text, tone);
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error in rewriteText:", error);
    return text; // Return original text on failure
  }
};

/**
 * Summarizes a list of messages.
 * @param {Array} messages 
 * @returns {Promise<string>}
 */
export const summarizeMessages = async (messages) => {
  try {
    const prompt = getSummaryPrompt(messages);
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error in summarizeMessages:", error);
    throw error;
  }
};

/**
 * Transcribes audio from base64 data.
 * @param {string} base64AudioData - Base64 encoded audio string
 * @param {string} mimeType - e.g. "audio/webm" or "audio/mp3"
 * @returns {Promise<string>}
 */
export const transcribeVoice = async (base64AudioData, mimeType) => {
  try {
    const prompt = getTranscriptionPrompt();
    const audioPart = {
      inlineData: {
        data: base64AudioData.split(",")[1] || base64AudioData, // Strip data URI prefix if present
        mimeType: mimeType || "audio/webm",
      },
    };

    const result = await geminiModel.generateContent([prompt, audioPart]);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error in transcribeVoice:", error);
    throw error;
  }
};

/**
 * Summarizes long audio transcription texts.
 * @param {string} transcript 
 * @returns {Promise<string>}
 */
export const summarizeAudioTranscript = async (transcript) => {
  try {
    const prompt = `Provide a very short, one-sentence summary (less than 15 words) of this transcription:\n\n"${transcript}"`;
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error in summarizeAudioTranscript:", error);
    return "";
  }
};
