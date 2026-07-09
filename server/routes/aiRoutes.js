import express from "express";
import {
  getSmartRepliesHandler,
  rewriteMessageHandler,
  getUnreadSummaryHandler,
  semanticSearchHandler,
  transcribeAudioHandler,
} from "../controller/aiController.js";
import { protectRoute } from "../middleware/auth.js";

const aiRouter = express.Router();

// AI smart replies endpoint
aiRouter.post("/smart-reply", protectRoute, getSmartRepliesHandler);

// AI text tone rewrite endpoint
aiRouter.post("/rewrite", protectRoute, rewriteMessageHandler);

// AI unread message list bullet summary endpoint
aiRouter.post("/chat-summary", protectRoute, getUnreadSummaryHandler);

// AI semantic logs vector match search endpoint
aiRouter.post("/semantic-search", protectRoute, semanticSearchHandler);

// Standalone AI voice note transcription endpoint
aiRouter.post("/transcribe", protectRoute, transcribeAudioHandler);

export default aiRouter;
