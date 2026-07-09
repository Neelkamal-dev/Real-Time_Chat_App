import Group from "../models/Group.js";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { transcribeVoice, summarizeAudioTranscript } from "../services/aiService.js";
import { vectorStore } from "../services/vectorStore.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, members, avatar } = req.body;
    const admin = req.user._id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Group name is required" });
    }

    const groupMembers = members ? [...members] : [];
    if (!groupMembers.includes(admin.toString())) {
      groupMembers.push(admin.toString());
    }

    let avatarUrl = "";
    if (avatar) {
      const uploadedAvatar = await cloudinary.uploader.upload(avatar);
      avatarUrl = uploadedAvatar.secure_url;
    }

    const newGroup = await Group.create({
      name,
      description,
      members: groupMembers,
      admin,
      avatar: avatarUrl,
    });

    const populatedGroup = await Group.findById(newGroup._id)
      .populate("members", "-password")
      .populate("admin", "-password");

    // Notify all members that they have been added to a group
    groupMembers.forEach((memberId) => {
      if (memberId.toString() !== admin.toString()) {
        const socketId = userSocketMap[memberId];
        if (socketId) {
          io.to(socketId).emit("group-created", populatedGroup);
        }
      }
    });

    res.json({ success: true, group: populatedGroup, message: "Group created successfully" });
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all groups the logged-in user belongs to
export const getUserGroups = async (req, res) => {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ members: userId })
      .populate("members", "-password")
      .populate("admin", "-password");
    res.json({ success: true, groups });
  } catch (error) {
    console.error("Error fetching user groups:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get messages for a specific group with cursor-based pagination
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { limit = 20, before } = req.query;

    const query = { groupId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Load recent first (descending), then reverse to return chronological order
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .populate("senderId", "fullName profilePic");

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error("Error getting group messages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send a message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, audio, mimeType, duration } = req.body;
    const { groupId } = req.params;
    const senderId = req.user._id;

    // Check if group exists and user is a member
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found" });
    }

    if (!group.members.includes(senderId)) {
      return res.status(403).json({ success: false, message: "Not authorized to post to this group" });
    }

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
        console.error("AI audio transcription error (group):", err.message);
      }
    }

    // Generate semantic embedding vector
    let embedding = [];
    const textToEmbed = text || transcription;
    if (textToEmbed) {
      try {
        embedding = await generateEmbedding(textToEmbed);
      } catch (err) {
        console.error("AI embedding generation failed (group):", err.message);
      }
    }

    const newMessage = await Message.create({
      senderId,
      groupId,
      text,
      image: imageUrl,
      audioUrl,
      transcription,
      audioSummary,
    });

    if (embedding && embedding.length > 0) {
      await vectorStore.upsert(newMessage._id, embedding, { chatId: groupId });
    }

    const populatedMessage = await Message.findById(newMessage._id).populate("senderId", "fullName profilePic");

    // Emit to other group members
    group.members.forEach((memberId) => {
      if (memberId.toString() !== senderId.toString()) {
        const socketId = userSocketMap[memberId];
        if (socketId) {
          io.to(socketId).emit("new-message", populatedMessage);
        }
      }
    });

    res.json({ success: true, newMessage: populatedMessage });
  } catch (error) {
    console.error("Error sending group message:", error);
    res.status(550).json({ success: false, message: error.message });
  }
};
