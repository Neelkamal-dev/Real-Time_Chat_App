// Get all users except the logged in user 
import User from "../models/User.js";
import Message from "../models/message.js";
import Group from "../models/Group.js";
import cloudinary from "../lib/cloudinary.js";
import {io,userSocketMap} from "../server.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { transcribeVoice, summarizeAudioTranscript } from "../services/aiService.js";

export const getUserForSidebar = async (req, res) =>{
  try {
    const userId = req.user._id;
    const filteredUsers = await User.find({_id:{$ne : userId}}).select("-password");

    // count number of messages not seen 

    const unseenMessages = {}
    const promises = filteredUsers.map(async (user)=>{
      const messages = await Message.find({senderId : user._id,receiverId : userId,seen:false})
      if(messages.length > 0){
        unseenMessages[user._id] = messages.length;
      }
    })
    await Promise.all(promises);
    res.json({success:true,users:filteredUsers,unseenMessages})
  } catch (error) {
    console.log(error.message);
    res.json({success:false,message:error.message})
    
  }
}

// Get all messages for selected user
export const getMessages = async (req,res)=>{
  try {
    const {id:selectedUserId} = req.params;
    const myId = req.user._id;
    const messages = await Message.find({$or : [{senderId : selectedUserId,receiverId : myId},{senderId : myId,receiverId : selectedUserId}]})
    // update seen status of messages
    await Message.updateMany({senderId : selectedUserId,receiverId : myId},{seen:true})

    // Notify the sender that all their messages are seen
    const senderSocketId = userSocketMap[selectedUserId];
    if(senderSocketId){
      io.to(senderSocketId).emit("messages-seen", { viewerId: myId });
    }

    res.json({success:true,messages})
  }catch(error){
    console.log(error.message);
    res.json({success:false,message:error.message}) 
  }
}

// api to mark message as seen using message id
export const markMessageAsSeen = async (req,res)=>{
  try {
    const {id:messageId} = req.params;  
    const updatedMessage = await Message.findByIdAndUpdate(messageId,{seen:true},{new:true});
    if(updatedMessage){
      const senderSocketId = userSocketMap[updatedMessage.senderId];
      if(senderSocketId){
        io.to(senderSocketId).emit("message-seen", { messageId: updatedMessage._id, receiverId: updatedMessage.receiverId });
      }
    }
    res.json({success:true,message:"Message marked as seen"})
  }catch(error){
    console.log(error.message);
    res.json({success:false,message:error.message}) 
  }
}

//send message to selected user
export const sendMessage = async (req,res)=>{
  try { 
    const {image,text,audio,mimeType} = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;
    
    let imageUrl = "";
    if(image){
      const uploadedImage = await cloudinary.uploader.upload(image);
      imageUrl = uploadedImage.secure_url;
    }

    let audioUrl = "";
    let transcription = "";
    let audioSummary = "";

    if(audio){
      try {
        const uploadedAudio = await cloudinary.uploader.upload(audio, { resource_type: "video" });
        audioUrl = uploadedAudio.secure_url;
        transcription = await transcribeVoice(audio, mimeType);
        if (transcription && transcription.length > 100) {
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
      embedding,
    });
    await newMessage.save();

    // Emit the new message to the receiver if they are online
    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
      io.to(receiverSocketId).emit("new-message", newMessage);
    }

    res.json({success:true,newMessage});
  }catch(error){
    console.log(error.message);
    res.json({success:false,message:error.message}) 
  } 
}

// React to message (toggle reaction)
export const reactToMessage = async (req, res) => {
  try {
    const { id: messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.user._id;

    if (!emoji) {
      return res.status(400).json({ success: false, message: "Emoji is required" });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // Check if user already reacted
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Toggle off (remove reaction)
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Update reaction emoji
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Add new reaction
      message.reactions.push({ userId, emoji });
    }

    await message.save();

    // Notify other users
    if (message.groupId) {
      const group = await Group.findById(message.groupId);
      if (group) {
        group.members.forEach((memberId) => {
          if (memberId.toString() !== userId.toString()) {
            const socketId = userSocketMap[memberId];
            if (socketId) {
              io.to(socketId).emit("message-reaction", { messageId, reactions: message.reactions });
            }
          }
        });
      }
    } else {
      const targets = [message.senderId, message.receiverId];
      targets.forEach((targetId) => {
        if (targetId.toString() !== userId.toString()) {
          const socketId = userSocketMap[targetId];
          if (socketId) {
            io.to(socketId).emit("message-reaction", { messageId, reactions: message.reactions });
          }
        }
      });
    }

    res.json({ success: true, reactions: message.reactions });
  } catch (error) {
    console.error("Error in reactToMessage:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};