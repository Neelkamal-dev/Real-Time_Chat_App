import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId : {type:mongoose.Schema.Types.ObjectId,ref: "User",required:true},
    receiverId : {type:mongoose.Schema.Types.ObjectId,ref: "User"},
    groupId : {type:mongoose.Schema.Types.ObjectId,ref: "Group"},
    text : {type:String},
    image : {type: String},
    seen : { type : Boolean,default : false},
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        emoji: { type: String, required: true }
      }
    ],
    embedding: {
      type: [Number],
      default: []
    },
    audioUrl: {
      type: String
    },
    transcription: {
      type: String
    },
    audioSummary: {
      type: String
    }
}, { timestamps: true });   

// Compound query performance indexes
messageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });
messageSchema.index({ receiverId: 1, seen: 1 });
messageSchema.index({ groupId: 1, createdAt: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;  