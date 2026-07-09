// Get all users except the logged in user 
import User from "../models/User.js";
import Message from "../models/message.js";
import cloudinary from "../lib/cloudinary.js";
import {io,userSocketMap} from "../server.js";

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
    await Message.findByIdAndUpdate(messageId,{seen:true})
    res.json({success:true,message:"Message marked as seen"})
  }catch(error){
    console.log(error.message);
    res.json({success:false,message:error.message}) 
  }
}

//send message to selected user
export const sendMessage = async (req,res)=>{
  try { 
    const {image,text} = req.body;
    const receiverId = req.params.id;
    const senderId = req.user._id;
    let imageUrl = "";
    if(image){
      const uploadedImage = await cloudinary.uploader.upload(image);
      imageUrl = uploadedImage.secure_url;
    }

    const newMessage = await Message.create({senderId,receiverId,text,image:imageUrl});
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