import { geminiModel } from "../config/gemini.js";
import { getSmartReplyPrompt } from "../prompts/replyPrompt.js";
import { getRewritePrompt } from "../prompts/rewritePrompt.js";
import { getSummaryPrompt } from "../prompts/summaryPrompt.js";
import { getTranscriptionPrompt, getAudioSummaryPrompt } from "../prompts/transcriptionPrompt.js";
import { validateSmartReply, validateRewrite, validateSummary } from "./responseValidator.js";

/**
 * Generates 3-5 smart reply suggestions from conversation context with validation retries.
 * @param {Array} messagesContext 
 * @returns {Promise<string[]>}
 */
export const generateSmartReplies = async (messagesContext) => {
  let attempts = 0;
  const maxAttempts = 2;
  const prompt = getSmartReplyPrompt(messagesContext);

  while (attempts < maxAttempts) {
    try {
      const result = await geminiModel.generateContent(prompt);
      const rawText = result.response.text();
      
      const validation = validateSmartReply(rawText);
      if (validation.isValid) {
        return validation.data;
      }
      console.warn(`Smart reply validation failed (attempt ${attempts + 1}/2):`, validation.error);
    } catch (error) {
      console.error(`Error in generateSmartReplies (attempt ${attempts + 1}/2):`, error.message);
    }
    attempts++;
  }

  // Graceful fallback suggestions
  return ["Got it!", "Thanks for sharing.", "Understood."];
};

/**
 * Rewrites draft messages with tone selection and validation retries.
 * @param {string} text 
 * @param {string} tone 
 * @returns {Promise<string>}
 */
export const rewriteText = async (text, tone) => {
  let attempts = 0;
  const maxAttempts = 2;
  const prompt = getRewritePrompt(text, tone);

  while (attempts < maxAttempts) {
    try {
      const result = await geminiModel.generateContent(prompt);
      const rawText = result.response.text();

      const validation = validateRewrite(rawText);
      if (validation.isValid) {
        return validation.data;
      }
      console.warn(`Text rewrite validation failed (attempt ${attempts + 1}/2):`, validation.error);
    } catch (error) {
      console.error(`Error in rewriteText (attempt ${attempts + 1}/2):`, error.message);
    }
    attempts++;
  }

  // Return the original text block if validation fails
  return text;
};

/**
 * Summarizes lists of messages with validation retries.
 * @param {Array} messages 
 * @returns {Promise<string>}
 */
export const summarizeMessages = async (messages) => {
  let attempts = 0;
  const maxAttempts = 2;
  const prompt = getSummaryPrompt(messages);

  while (attempts < maxAttempts) {
    try {
      const result = await geminiModel.generateContent(prompt);
      const rawText = result.response.text();

      const validation = validateSummary(rawText);
      if (validation.isValid) {
        return validation.data;
      }
      console.warn(`Chat summary validation failed (attempt ${attempts + 1}/2):`, validation.error);
    } catch (error) {
      console.error(`Error in summarizeMessages (attempt ${attempts + 1}/2):`, error.message);
    }
    attempts++;
  }

  return "Could not generate chat summary at this time.";
};

/**
 * Transcribes audio base64 buffers directly.
 * @param {string} base64AudioData 
 * @param {string} mimeType 
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
    const prompt = getAudioSummaryPrompt(transcript);
    const result = await geminiModel.generateContent(prompt);
    return result.response.text().trim();
  } catch (error) {
    console.error("Error in summarizeAudioTranscript:", error);
    return "";
  }
};

/**
 * Streams rewrite text tone variations.
 */
export const rewriteTextStream = async (text, tone) => {
  const prompt = getRewritePrompt(text, tone);
  return await geminiModel.generateContentStream(prompt);
};

/**
 * Streams chat history summaries.
 */
export const summarizeMessagesStream = async (messages) => {
  const prompt = getSummaryPrompt(messages);
  return await geminiModel.generateContentStream(prompt);
};

/**
 * Streams audio voice transcriptions.
 */
export const transcribeVoiceStream = async (base64AudioData, mimeType) => {
  const prompt = getTranscriptionPrompt();
  const audioPart = {
    inlineData: {
      data: base64AudioData.split(",")[1] || base64AudioData,
      mimeType: mimeType || "audio/webm",
    },
  };
  return await geminiModel.generateContentStream([prompt, audioPart]);
};
