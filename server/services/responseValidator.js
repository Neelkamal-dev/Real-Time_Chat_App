/**
 * Validates Smart Reply suggestion array format.
 * Strips potential markdown JSON blocks before parsing.
 * @param {string} rawOutput 
 * @returns {{isValid: boolean, data?: string[], error?: string}}
 */
export const validateSmartReply = (rawOutput) => {
  try {
    let cleaned = rawOutput.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string" && item.trim().length > 0)) {
      return { isValid: true, data: parsed.map(s => s.trim()) };
    }
    return { isValid: false, error: "Output is not an array of non-empty strings." };
  } catch (err) {
    return { isValid: false, error: `JSON Parse error: ${err.message}` };
  }
};

/**
 * Validates tone rewrite text output.
 * @param {string} rawOutput 
 * @returns {{isValid: boolean, data?: string, error?: string}}
 */
export const validateRewrite = (rawOutput) => {
  if (rawOutput && typeof rawOutput === "string" && rawOutput.trim().length > 0) {
    return { isValid: true, data: rawOutput.trim() };
  }
  return { isValid: false, error: "Empty or invalid rewrite text." };
};

/**
 * Validates chat summaries output.
 * @param {string} rawOutput 
 * @returns {{isValid: boolean, data?: string, error?: string}}
 */
export const validateSummary = (rawOutput) => {
  if (rawOutput && typeof rawOutput === "string" && rawOutput.trim().length > 0) {
    return { isValid: true, data: rawOutput.trim() };
  }
  return { isValid: false, error: "Empty or invalid summary text." };
};

/**
 * Validates Search query embeddings dimensions.
 * @param {any} rawOutput 
 * @returns {{isValid: boolean, data?: number[], error?: string}}
 */
export const validateSearch = (rawOutput) => {
  if (Array.isArray(rawOutput) && rawOutput.length > 0 && rawOutput.every((num) => typeof num === "number")) {
    return { isValid: true, data: rawOutput };
  }
  return { isValid: false, error: "Embedding is not a valid floating-point numerical vector." };
};

export default {
  validateSmartReply,
  validateRewrite,
  validateSummary,
  validateSearch,
};
