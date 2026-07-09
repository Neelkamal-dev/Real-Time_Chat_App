import express from "express";
import {
  getSmartRepliesHandler,
  rewriteMessageHandler,
  getUnreadSummaryHandler,
  semanticSearchHandler,
} from "../controller/aiController.js";
import { protectRoute } from "../middleware/auth.js";

const aiRouter = express.Router();

// AI smart replies endpoint
aiRouter.get("/suggestions/:chatId", protectRoute, getSmartRepliesHandler);

// AI text tone rewrite endpoint
aiRouter.post("/rewrite", protectRoute, rewriteMessageHandler);

// AI unread message list bullet summary endpoint
aiRouter.get("/unread-summary/:chatId", protectRoute, getUnreadSummaryHandler);

// AI semantic logs vector match search endpoint
aiRouter.get("/search/:chatId", protectRoute, semanticSearchHandler);

export default aiRouter;
