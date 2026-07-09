import User from "../models/User.js";
import Message from "../models/message.js";
import Group from "../models/Group.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { transcribeVoice, summarizeAudioTranscript } from "../services/aiService.js";
import { vectorStore } from "../services/vectorStore.js";

// Fetch sidebar contact list and compute unseen counts using dynamic aggregations
export const getUserForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: userId } }).select("-password");

    // Single aggregation query to fetch all unseen counts (avoid N+1 queries)
    const unseenCounts = await Message.aggregate([
      {
        $match: {
          receiverId: userId,
          seen: false,
        },
      },
      {
        $group: {
          _id: "$senderId",
          count: { $sum: 1 },
        },
      },
    ]);

    const unseenMessages = {};
    unseenCounts.forEach((item) => {
      if (item._id) {
        unseenMessages[item._id.toString()] = item.count;
      }
    });

    res.json({ success: true, users: filteredUsers, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Get messages for selected user with cursor-based pagination
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;
    const { limit = 20, before } = req.query;

    const query = {
      $or: [
        { senderId: selectedUserId, receiverId: myId },
        { senderId: myId, receiverId: selectedUserId },
      ],
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Load recent first (descending), then reverse to return chronological order
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    // Update seen status of messages
    await Message.updateMany({ senderId: selectedUserId, receiverId: myId }, { seen: true });

    // Notify the sender that all their messages are seen
    const senderSocketId = userSocketMap[selectedUserId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("messages-seen", { viewerId: myId });
    }

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// api to mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const updatedMessage = await Message.findByIdAndUpdate(messageId, { seen: true }, { new: true });
    if (updatedMessage) {
      const senderSocketId = userSocketMap[updatedMessage.senderId];
      if (senderSocketId) {
        io.to(senderSocketId).emit("message-seen", { messageId: updatedMessage._id, receiverId: updatedMessage.receiverId });
      }
    }
    res.json({ success: true, message: "Message marked as seen" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// send message to selected user
export const sendMessage = async (req, res) => {
  try {
    const { image, text, audio, mimeType, duration } = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    let imageUrl = "";
    if (image) {
      const uploadedImage = await cloudinary.uploader.upload(image);
      imageUrl = uploadedImage.secure_url;
    }

    let audioUrl = "";
    let transcription = "";
    let audioSummary = "";

    if (audio) {
      try {
        const uploadedAudio = await cloudinary.uploader.upload(audio, { resource_type: "video" });
        audioUrl = uploadedAudio.secure_url;
        transcription = await transcribeVoice(audio, mimeType);
        if (transcription && duration && Number(duration) > 60) {
          audioSummary = await summarizeAudioTranscript(transcription);
        }
      } catch (err) {
        console.error("AI audio transcription error:", err.message);
      }
    }

    // Generate semantic embedding vector
    let embedding = [];
    const textToEmbed = text || transcription;
    if (textToEmbed) {
      try {
        embedding = await generateEmbedding(textToEmbed);
      } catch (err) {
        console.error("AI embedding generation failed:", err.message);
      }
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      audioUrl,
      transcription,
      audioSummary,
    });

    if (embedding && embedding.length > 0) {
      await vectorStore.upsert(newMessage._id, embedding, { chatId: receiverId });
    }

    // Emit the new message to the receiver if they are online
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("new-message", newMessage);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Toggle emoji reaction to a message
export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Emit the reaction update to sender and receiver
    const receiverSocketId = userSocketMap[message.receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("message-reaction", {
        messageId: message._id,
        reactions: message.reactions,
      });
    }
    const senderSocketId = userSocketMap[message.senderId];
    if (senderSocketId) {
      io.to(senderSocketId).emit("message-reaction", {
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.error("Error reacting to message:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};