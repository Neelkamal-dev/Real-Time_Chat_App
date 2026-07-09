import Message from "../models/message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import { generateSmartReplies, rewriteText, summarizeMessages } from "../services/aiService.js";
import { generateEmbedding, cosineSimilarity } from "../services/embeddingService.js";
import { cacheService } from "../services/cacheService.js";

// Helper to query message history of a chat (private or group)
const fetchChatHistory = async (userId, chatId, limit = 10) => {
  // Check if chatId belongs to a group
  const isGroup = await Group.exists({ _id: chatId });

  if (isGroup) {
    return await Message.find({ groupId: chatId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "fullName");
  } else {
    // Private chat between userId and chatId
    return await Message.find({
      $or: [
        { senderId: userId, receiverId: chatId },
        { senderId: chatId, receiverId: userId },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "fullName");
  }
};

// Generate smart reply suggestions
export const getSmartRepliesHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!chatId) {
      return res.status(400).json({ success: false, message: "Chat ID is required" });
    }

    const cacheKey = `suggestions:${chatId}:${userId}`;
    const cachedSuggestions = cacheService.get(cacheKey);
    if (cachedSuggestions) {
      return res.json({ success: true, suggestions: cachedSuggestions });
    }

    // Fetch last 10 messages
    const history = await fetchChatHistory(userId, chatId, 10);
    if (history.length === 0) {
      return res.json({ success: true, suggestions: ["Hey!", "How are you?", "Hello! 👋"] });
    }

    // Reverse history to chronological order
    const chronoHistory = [...history].reverse();

    // Map messages for AI context
    const context = chronoHistory.map((msg) => ({
      sender: msg.senderId?._id?.toString() === userId.toString() ? "Me" : (msg.senderId?.fullName || "User"),
      text: msg.text || (msg.image ? "[Sent an image]" : "[Attachment]"),
      time: msg.createdAt,
    }));

    // Check if the last message was sent by the current user. 
    // If we sent the last message, smart replies are less relevant than if we received it.
    const lastMsg = chronoHistory[chronoHistory.length - 1];
    if (lastMsg.senderId?._id?.toString() === userId.toString()) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await generateSmartReplies(context);
    cacheService.set(cacheKey, suggestions, 30000); // Cache suggestions for 30s

    res.json({ success: true, suggestions });
  } catch (error) {
    console.error("Error in getSmartRepliesHandler:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Rewrite message text in a specific tone
export const rewriteMessageHandler = async (req, res) => {
  try {
    const { text, tone } = req.body;

    if (!text || !tone) {
      return res.status(400).json({ success: false, message: "Text and tone are required." });
    }

    const cacheKey = `rewrite:${tone}:${Buffer.from(text).toString("base64")}`;
    const cachedRewrite = cacheService.get(cacheKey);
    if (cachedRewrite) {
      return res.json({ success: true, rewrittenText: cachedRewrite });
    }

    const rewrittenText = await rewriteText(text, tone);
    cacheService.set(cacheKey, rewrittenText, 60000); // Cache for 1 min

    res.json({ success: true, rewrittenText });
  } catch (error) {
    console.error("Error in rewriteMessageHandler:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Summarize unread messages
export const getUnreadSummaryHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const userId = req.user._id;

    if (!chatId) {
      return res.status(400).json({ success: false, message: "Chat ID is required." });
    }

    const isGroup = await Group.exists({ _id: chatId });
    let unreadMessages = [];

    if (isGroup) {
      // Group unread - messages created after user joined or check simple unseen
      // For groups we pull messages where sender is not us and they are created recently
      // To keep it simple: fetch last 30 messages in group that aren't sent by me
      unreadMessages = await Message.find({
        groupId: chatId,
        senderId: { $ne: userId }
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("senderId", "fullName");
    } else {
      // Private chat unread - messages from chatId to userId that are not seen
      unreadMessages = await Message.find({
        senderId: chatId,
        receiverId: userId,
        seen: false
      })
        .sort({ createdAt: -1 })
        .populate("senderId", "fullName");
    }

    if (unreadMessages.length === 0) {
      return res.json({ success: true, summary: "All caught up! No unread messages." });
    }

    // Chrono order
    const chronoUnread = [...unreadMessages].reverse();

    const formattedMessages = chronoUnread.map((m) => ({
      sender: m.senderId?.fullName || "User",
      text: m.text || "[Shared image/file]",
    }));

    const summary = await summarizeMessages(formattedMessages);
    res.json({ success: true, summary });
  } catch (error) {
    console.error("Error in getUnreadSummaryHandler:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Semantic chat logs search
export const semanticSearchHandler = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { query } = req.query;
    const userId = req.user._id;

    if (!chatId || !query) {
      return res.status(400).json({ success: false, message: "Chat ID and query are required." });
    }

    // 1. Generate query embedding
    const queryVector = await generateEmbedding(query);

    // 2. Fetch all messages in the conversation
    const isGroup = await Group.exists({ _id: chatId });
    let messages = [];

    if (isGroup) {
      messages = await Message.find({ groupId: chatId }).populate("senderId", "fullName profilePic");
    } else {
      messages = await Message.find({
        $or: [
          { senderId: userId, receiverId: chatId },
          { senderId: chatId, receiverId: userId },
        ],
      }).populate("senderId", "fullName profilePic");
    }

    // 3. Score matching using cosine similarity (and lazy-embed empty vector slots)
    const scoredMatches = [];

    for (const msg of messages) {
      if (!msg.text) continue; // Skip audio-only/image-only without text

      // Lazy-generate embedding vector for existing database logs missing them
      if (!msg.embedding || msg.embedding.length === 0) {
        try {
          msg.embedding = await generateEmbedding(msg.text);
          await msg.save();
        } catch (err) {
          console.error(`Failed to lazy-embed message ${msg._id}:`, err);
          continue;
        }
      }

      const similarity = cosineSimilarity(queryVector, msg.embedding);
      
      // Keep results with moderate similarity match scores (> 0.40)
      if (similarity > 0.40) {
        scoredMatches.push({
          message: {
            _id: msg._id,
            text: msg.text,
            image: msg.image,
            audioUrl: msg.audioUrl,
            transcription: msg.transcription,
            seen: msg.seen,
            senderId: msg.senderId,
            createdAt: msg.createdAt,
          },
          score: similarity,
        });
      }
    }

    // 4. Sort descending
    scoredMatches.sort((a, b) => b.score - a.score);

    res.json({ success: true, matches: scoredMatches.slice(0, 10) });
  } catch (error) {
    console.error("Error in semanticSearchHandler:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
