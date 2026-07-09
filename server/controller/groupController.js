import Group from "../models/Group.js";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { transcribeVoice, summarizeAudioTranscript } from "../services/aiService.js";

// Create a new group
export const createGroup = async (req, res) => {
  try {
    const { name, description, members, avatar } = req.body;
    const admin = req.user._id;

    if (!name) {
      return res.status(400).json({ success: false, message: "Group name is required" });
    }

    // Add admin to members list if not already present
    let groupMembers = Array.isArray(members) ? [...members] : [];
    if (!groupMembers.includes(admin.toString())) {
      groupMembers.push(admin.toString());
    }

    let avatarUrl = "";
    if (avatar) {
      const upload = await cloudinary.uploader.upload(avatar);
      avatarUrl = upload.secure_url;
    }

    const newGroup = new Group({
      name,
      description,
      members: groupMembers,
      admin,
      avatar: avatarUrl,
    });

    await newGroup.save();

    // Populate members for response
    const populatedGroup = await Group.findById(newGroup._id).populate("members", "-password");

    // Socket notify online members about group creation
    groupMembers.forEach((memberId) => {
      if (memberId !== admin.toString()) {
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

// Get all messages for a specific group
export const getGroupMessages = async (req, res) => {
  try {
    const { groupId } = req.params;
    const messages = await Message.find({ groupId })
      .populate("senderId", "fullName profilePic");
    res.json({ success: true, messages });
  } catch (error) {
    console.error("Error getting group messages:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Send a message to a group
export const sendGroupMessage = async (req, res) => {
  try {
    const { text, image, audio, mimeType } = req.body;
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
        if (transcription && transcription.length > 100) {
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
      embedding,
    });
    await newMessage.save();

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
    res.status(500).json({ success: false, message: error.message });
  }
};
