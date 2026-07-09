import express from "express";
import {
  getSmartRepliesHandler,
  rewriteMessageHandler,
  getUnreadSummaryHandler,
  semanticSearchHandler,
  transcribeAudioHandler,
} from "../controller/aiController.js";
import { protectRoute } from "../middleware/auth.js";
import { aiRateLimiter } from "../middleware/rateLimiter.js";

const aiRouter = express.Router();

// AI smart replies endpoint - rate limited to 30 requests/minute
aiRouter.post("/smart-reply", protectRoute, aiRateLimiter(30, 60000), getSmartRepliesHandler);

// AI text tone rewrite endpoint - rate limited to 30 requests/minute
aiRouter.post("/rewrite", protectRoute, aiRateLimiter(30, 60000), rewriteMessageHandler);

// AI unread message list bullet summary endpoint - rate limited to 30 requests/minute
aiRouter.post("/chat-summary", protectRoute, aiRateLimiter(30, 60000), getUnreadSummaryHandler);

// AI semantic logs vector match search endpoint - rate limited to 30 requests/minute
aiRouter.post("/semantic-search", protectRoute, aiRateLimiter(30, 60000), semanticSearchHandler);

// Standalone AI voice note transcription endpoint - rate limited to 30 requests/minute
aiRouter.post("/transcribe", protectRoute, aiRateLimiter(30, 60000), transcribeAudioHandler);

export default aiRouter;
