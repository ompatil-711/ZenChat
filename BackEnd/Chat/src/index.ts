import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import chatRoutes from './routes/chat.js';
import cors from 'cors';
import { app, server } from './config/socket.js';

dotenv.config();

// 1. CORS Configuration
// We allow "*" so your Frontend (Localhost or Render) can connect easily
app.use(cors({
  origin: "*", 
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

// 2. Middleware
app.use(express.json());

// 3. Routes
// This creates the endpoint: https://zenchat-server.onrender.com/api/v1/chat
app.use("/api/v1/chat", chatRoutes);

const port = process.env.PORT || 5001; 

// 4. Robust Server Startup
// Using a function ensures DB connects BEFORE the server starts
const startServer = async () => {
    try {
        await connectDb();
        console.log("✅ Connected to MongoDB (Chat Service)");

        server.listen(port, () => {
            console.log(`✅ Chat Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("❌ Failed to start Chat Server:", error);
        process.exit(1);
    }
};

startServer();