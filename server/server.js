import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import { Server } from "socket.io";

dotenv.config(); // load .env variables

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Socket.IO setup
export const io = new Server(server, {
  cors: { origin: "*" },
});

export const userSocketMap = {}; // Map to store userId to socketId mapping


// Socket.IO connection handler
io.on("connection", (socket) => {
  const userId = socket.handshake.query.userId;
  console.log("User connected:", userId);

  if(userId){
    userSocketMap[userId] = socket.id; // Store the mapping of userId to socketId
  }
  
  //Emit online users to all clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ receiverId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    const receiverSocketId = userSocketMap[receiverId];
    if(receiverSocketId){
      io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
    }
  });

  socket.on("disconnect", () => { 
    console.log("User disconnected:", userId);
    delete userSocketMap[userId]; // Remove the mapping when user disconnects
    io.emit("getOnlineUsers", Object.keys(userSocketMap)); // Emit updated online users list
  })
});



// Middleware setup
app.use(express.json({ limit: "4mb" }));
app.use(cors());

// Health check route
app.use("/api/status", (req, res) => {
  res.send("Server is running");
});
app.use("/api/auth",userRouter);
app.use("/api/messages",messageRouter);
app.use("/api/groups",groupRouter);

// Connect to DB before starting server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});
