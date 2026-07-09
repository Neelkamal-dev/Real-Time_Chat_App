import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { connectDB } from "./lib/db.js";
import userRouter from "./routes/userRoutes.js";
import messageRouter from "./routes/messageRoutes.js";
import groupRouter from "./routes/groupRoutes.js";
import aiRouter from "./routes/aiRoutes.js";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

dotenv.config();

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// CORS Origin configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:5173", "http://localhost:3000", "http://localhost:5174"];

const corsOptions = {
  origin: allowedOrigins,
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "4mb" }));

// Socket.IO Server Setup
export const io = new Server(server, {
  cors: { origin: allowedOrigins },
});

export const userSocketMap = {};

// Socket.IO Authentication Middleware (verifies JWT before establishing connection)
io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error("Authentication error: Missing session token."));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    return next(new Error("Authentication error: Invalid or expired token."));
  }
});

// Socket.IO Connection Handler
io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log("Authenticated user connected to socket:", userId);

  if (userId) {
    userSocketMap[userId] = socket.id;
  }
  
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("typing", ({ receiverId }) => {
    if (!receiverId) return;
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("typing", { senderId: userId });
    }
  });

  socket.on("stopTyping", ({ receiverId }) => {
    if (!receiverId) return;
    const receiverSocketId = userSocketMap[receiverId];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("stopTyping", { senderId: userId });
    }
  });

  socket.on("disconnect", () => { 
    console.log("User disconnected from socket:", userId);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

// Health check route
app.use("/api/status", (req, res) => {
  res.send("Server is running");
});

// Router mappings
app.use("/api/auth", userRouter);
app.use("/api/messages", messageRouter);
app.use("/api/groups", groupRouter);
app.use("/api/ai", aiRouter);

// Connect to DB before starting server
connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
  });
});
