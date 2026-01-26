import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import chatRoutes from './routes/chat.js';
import cors from 'cors';
import { app, server } from './config/socket.js';

dotenv.config();

// 1. CORS Configuration
// Allows Cron Job & Frontend to connect
app.use(cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

// 2. Middleware
app.use(express.json());

// --- 👇 CRON JOB HEALTH CHECK (THE FIX) 👇 ---
// This simple route tells cron-job.org "I am awake" with a 200 OK status.
app.get("/", (req, res) => {
    res.status(200).send("OK");
});
// ---------------------------------------------

// 3. Routes
// Endpoint: https://zenchat-chat.onrender.com/api/v1/chat
app.use("/api/v1/chat", chatRoutes);

const port = process.env.PORT || 5001;

// 4. Robust Server Startup
const startServer = async () => {
    try {
        await connectDb();
        console.log("✅ Connected to MongoDB (Chat Service)");

        // Note: We use 'server.listen' (not app.listen) because we imported 'server' from socket.js
        server.listen(port, () => {
            console.log(`✅ Chat Server is running on port ${port}`);
        });
    } catch (error) {
        console.error("❌ Failed to start Chat Server:", error);
        process.exit(1);
    }
};

startServer();