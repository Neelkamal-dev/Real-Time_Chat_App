import mongoose from "mongoose";
import Message from "../models/message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import {
  generateSmartReplies,
  rewriteText,
  summarizeMessages,
  transcribeVoice,
  summarizeAudioTranscript
} from "../services/aiService.js";
import { generateEmbedding, cosineSimilarity } from "../services/embeddingService.js";
import { cacheService } from "../services/cacheService.js";
import { config } from "../config/gemini.js";

// Helper to query message history of a chat (private or group)
const fetchChatHistory = async (userId, chatId, limit = 10) => {
  const isGroup = await Group.exists({ _id: chatId });

  if (isGroup) {
    return await Message.find({ groupId: chatId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "fullName");
  } else {
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

// POST /api/ai/smart-reply
export const getSmartRepliesHandler = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "A valid Chat ID (chatId) is required." });
    }

    const cacheKey = `suggestions:${chatId}:${userId}`;
    const cachedSuggestions = cacheService.get(cacheKey);
    if (cachedSuggestions) {
      return res.json({ success: true, suggestions: cachedSuggestions });
    }

    const history = await fetchChatHistory(userId, chatId, config.maxHistory);
    if (history.length === 0) {
      return res.json({ success: true, suggestions: ["Hey!", "How are you?", "Hello! 👋"] });
    }

    const chronoHistory = [...history].reverse();

    const context = chronoHistory.map((msg) => ({
      sender: msg.senderId?._id?.toString() === userId.toString() ? "Me" : (msg.senderId?.fullName || "User"),
      text: msg.text || (msg.image ? "[Sent an image]" : "[Attachment]"),
      time: msg.createdAt,
    }));

    const lastMsg = chronoHistory[chronoHistory.length - 1];
    if (lastMsg.senderId?._id?.toString() === userId.toString()) {
      return res.json({ success: true, suggestions: [] });
    }

    const suggestions = await generateSmartReplies(context);
    cacheService.set(cacheKey, suggestions, 30000); 

    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error("Error in getSmartRepliesHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/rewrite
export const rewriteMessageHandler = async (req, res) => {
  try {
    const { text, tone } = req.body;

    if (!text || typeof text !== "string" || !tone || typeof tone !== "string") {
      return res.status(400).json({ success: false, message: "A valid text and tone are required." });
    }

    const allowedTones = ["Friendly", "Professional", "Polite", "Funny", "Romantic", "Short"];
    if (!allowedTones.includes(tone)) {
      return res.status(400).json({ success: false, message: `Invalid tone. Allowed: ${allowedTones.join(", ")}` });
    }

    const cacheKey = `rewrite:${tone}:${Buffer.from(text).toString("base64")}`;
    const cachedRewrite = cacheService.get(cacheKey);
    if (cachedRewrite) {
      return res.json({ success: true, rewrittenText: cachedRewrite });
    }

    const rewrittenText = await rewriteText(text, tone);
    cacheService.set(cacheKey, rewrittenText, 60000); 

    return res.status(200).json({ success: true, rewrittenText });
  } catch (error) {
    console.error("Error in rewriteMessageHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/chat-summary
export const getUnreadSummaryHandler = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "A valid Chat ID (chatId) is required." });
    }

    const isGroup = await Group.exists({ _id: chatId });
    let unreadMessages = [];

    if (isGroup) {
      unreadMessages = await Message.find({
        groupId: chatId,
        senderId: { $ne: userId }
      })
        .sort({ createdAt: -1 })
        .limit(30)
        .populate("senderId", "fullName");
    } else {
      unreadMessages = await Message.find({
        senderId: chatId,
        receiverId: userId,
        seen: false
      })
        .sort({ createdAt: -1 })
        .populate("senderId", "fullName");
    }

    if (unreadMessages.length === 0) {
      return res.status(200).json({ success: true, summary: "All caught up! No unread messages." });
    }

    const chronoUnread = [...unreadMessages].reverse();

    const formattedMessages = chronoUnread.map((m) => ({
      sender: m.senderId?.fullName || "User",
      text: m.text || "[Shared image/file]",
    }));

    const summary = await summarizeMessages(formattedMessages);
    return res.status(200).json({ success: true, summary });
  } catch (error) {
    console.error("Error in getUnreadSummaryHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/semantic-search
export const semanticSearchHandler = async (req, res) => {
  try {
    const { chatId, query } = req.body;
    const userId = req.user._id;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId) || !query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ success: false, message: "A valid Chat ID (chatId) and non-empty query are required." });
    }

    const queryVector = await generateEmbedding(query);

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

    const scoredMatches = [];

    for (const msg of messages) {
      if (!msg.text) continue;

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

    scoredMatches.sort((a, b) => b.score - a.score);

    return res.status(200).json({ success: true, matches: scoredMatches.slice(0, 10) });
  } catch (error) {
    console.error("Error in semanticSearchHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/transcribe
export const transcribeAudioHandler = async (req, res) => {
  try {
    const { audio, mimeType } = req.body;

    if (!audio || typeof audio !== "string") {
      return res.status(400).json({ success: false, message: "Base64 audio data string (audio) is required." });
    }

    const transcription = await transcribeVoice(audio, mimeType);
    
    let audioSummary = "";
    if (transcription && transcription.length > 100) {
      audioSummary = await summarizeAudioTranscript(transcription);
    }

    return res.status(200).json({
      success: true,
      transcription,
      audioSummary
    });
  } catch (error) {
    console.error("Error in transcribeAudioHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};
