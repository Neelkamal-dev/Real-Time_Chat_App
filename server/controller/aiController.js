import mongoose from "mongoose";
import Message from "../models/message.js";
import Group from "../models/Group.js";
import User from "../models/User.js";
import {
  generateSmartReplies,
  rewriteText,
  summarizeMessages,
  transcribeVoice,
  summarizeAudioTranscript,
  rewriteTextStream,
  summarizeMessagesStream,
  transcribeVoiceStream
} from "../services/aiService.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { cacheService } from "../services/cacheService.js";
import { config } from "../config/gemini.js";
import { vectorStore } from "../services/vectorStore.js";

// Helper to stream content progressively
const handleStreamResponse = async (res, streamPromise, cacheKey, ttlSeconds = 300) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  try {
    const stream = await streamPromise;
    let fullText = "";

    for await (const chunk of stream.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
    }

    if (cacheKey && fullText.trim()) {
      await cacheService.set(cacheKey, fullText, ttlSeconds);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("Streaming error:", error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
};

// Helper to simulate a progressive stream using cached data
const handleCachedStreamResponse = async (res, cachedValue) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  // Split content by character runs to simulate generation ticks
  const chunks = [];
  const chunkSize = 15;
  for (let i = 0; i < cachedValue.length; i += chunkSize) {
    chunks.push(cachedValue.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    await new Promise((resolve) => setTimeout(resolve, 20)); 
  }

  res.write("data: [DONE]\n\n");
  res.end();
};

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

// POST /api/ai/smart-reply (No streaming needed since suggestions are brief array elements)
export const getSmartRepliesHandler = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "A valid Chat ID (chatId) is required." });
    }

    const cacheKey = `suggestions:${chatId}:${userId}`;
    const cachedSuggestions = await cacheService.get(cacheKey);
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
    await cacheService.set(cacheKey, suggestions, 300); 

    return res.status(200).json({ success: true, suggestions });
  } catch (error) {
    console.error("Error in getSmartRepliesHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/rewrite (Upgraded to SSE streaming)
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
    const cachedRewrite = await cacheService.get(cacheKey);
    if (cachedRewrite) {
      return handleCachedStreamResponse(res, cachedRewrite);
    }

    const streamPromise = rewriteTextStream(text, tone);
    return handleStreamResponse(res, streamPromise, cacheKey, 300);
  } catch (error) {
    console.error("Error in rewriteMessageHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/chat-summary (Upgraded to SSE streaming)
export const getUnreadSummaryHandler = async (req, res) => {
  try {
    const { chatId } = req.body;
    const userId = req.user._id;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ success: false, message: "A valid Chat ID (chatId) is required." });
    }

    const cacheKey = `summary:${chatId}:${userId}`;
    const cachedSummary = await cacheService.get(cacheKey);
    if (cachedSummary) {
      return handleCachedStreamResponse(res, cachedSummary);
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
      return handleCachedStreamResponse(res, "All caught up! No unread messages.");
    }

    const chronoUnread = [...unreadMessages].reverse();

    const formattedMessages = chronoUnread.map((m) => ({
      sender: m.senderId?.fullName || "User",
      text: m.text || "[Shared image/file]",
    }));

    const streamPromise = summarizeMessagesStream(formattedMessages);
    return handleStreamResponse(res, streamPromise, cacheKey, 300);
  } catch (error) {
    console.error("Error in getUnreadSummaryHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/semantic-search (No streaming needed since returns list of mongoose messages metadata)
export const semanticSearchHandler = async (req, res) => {
  try {
    const { chatId, query } = req.body;

    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId) || !query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ success: false, message: "A valid Chat ID (chatId) and non-empty query are required." });
    }

    // 1. Generate query embedding (Embedding Generation)
    const queryVector = await generateEmbedding(query);

    // 2. Perform decoupled similarity vector search query (Vector Store / Similarity Search)
    const scoredMatches = await vectorStore.search(queryVector, chatId, 10);

    return res.status(200).json({ success: true, matches: scoredMatches });
  } catch (error) {
    console.error("Error in semanticSearchHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// POST /api/ai/transcribe (Upgraded to SSE streaming with duration-based summaries)
export const transcribeAudioHandler = async (req, res) => {
  try {
    const { audio, mimeType, duration } = req.body;

    if (!audio || typeof audio !== "string") {
      return res.status(400).json({ success: false, message: "Base64 audio data string (audio) is required." });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    try {
      const stream = await transcribeVoiceStream(audio, mimeType);
      let fullTranscription = "";

      for await (const chunk of stream.stream) {
        const chunkText = chunk.text();
        fullTranscription += chunkText;
        res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
      }

      // Generate summary only if duration exceeds 60 seconds
      let audioSummary = "";
      if (fullTranscription && duration && Number(duration) > 60) {
        audioSummary = await summarizeAudioTranscript(fullTranscription);
      }

      // Write summary metadata block to SSE connection
      res.write(`data: ${JSON.stringify({ summary: audioSummary })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Transcription streaming error:", error);
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error("Error in transcribeAudioHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};

// PUT /api/ai/transcription/:messageId (Edit transcript inline, regenerate embedding, update vector index)
export const updateMessageTranscriptionHandler = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { transcription } = req.body;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(messageId) || !transcription || typeof transcription !== "string" || !transcription.trim()) {
      return res.status(400).json({ success: false, message: "A valid message ID and transcription text are required." });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found." });
    }

    // Verify requesting user is the message sender
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized to update this transcription." });
    }

    message.transcription = transcription.trim();

    // Regenerate and update search vectors in background
    try {
      const newEmbedding = await generateEmbedding(message.transcription);
      await vectorStore.upsert(message._id, newEmbedding);
    } catch (err) {
      console.error("Failed to update embedding inside transcription save:", err.message);
    }

    await message.save();

    return res.status(200).json({
      success: true,
      message: "Transcription updated successfully.",
      transcription: message.transcription,
    });
  } catch (error) {
    console.error("Error in updateMessageTranscriptionHandler:", error);
    return res.status(500).json({ success: false, message: "Internal server error: " + error.message });
  }
};
