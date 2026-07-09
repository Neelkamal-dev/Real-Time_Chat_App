import crypto from "crypto";

/**
 * Structured AI Request Logger
 * Standard JSON layout safe for ELK, Datadog, or CloudWatch ingestion.
 * Strictly excludes any private user message content.
 * 
 * @param {object} params
 * @param {string} params.modelName - The AI model identifier (e.g. gemini-1.5-flash)
 * @param {number} params.responseTimeMs - Duration of request execution in milliseconds
 * @param {number} params.tokensCount - Approximate token length (input + output)
 * @param {boolean} params.success - Whether execution succeeded
 * @param {string} [params.errorMessage] - Validation or network error description
 */
export const logAIRequest = ({
  modelName,
  responseTimeMs,
  tokensCount,
  success,
  errorMessage = null,
}) => {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const logEntry = {
    requestId,
    timestamp,
    modelUsed: modelName,
    responseTimeMs,
    estimatedTokens: tokensCount || 0,
    success: !!success,
    failure: !success,
    errorMessage: errorMessage || undefined,
  };

  // Structured logs standard out stream
  console.log(`[AI_LOG] ${JSON.stringify(logEntry)}`);
};

export default logAIRequest;
