// BackEnd/server.ts

import dotenv from 'dotenv';
import cors from 'cors';
import express from 'express';
import { createClient } from 'redis';

// --- IMPORTS FROM YOUR MICROSERVICES ---
// 1. We use the 'app' and 'server' from Chat because it already has Socket.io attached!
import { app, server } from './Chat/src/config/socket.js'; 
import chatRoutes from './Chat/src/routes/chat.js';

// 2. User Routes & Config
import userRoutes from './User/src/routes/user.js';
import connectDb from './User/src/config/db.js'; // Using User DB config as primary
import { connectRabbitMQ } from './User/src/config/rabbitmq.js';

// 3. Mail Consumer
import { startSendOtpConsumer } from './Mail/src/consumer.js';

dotenv.config();

// --- 1. GLOBAL MIDDLEWARE ---
// We apply this to the 'app' we imported from socket.js
app.use(express.json());
app.use(cors({
    origin: "*", 
    credentials: true, 
    methods: ["GET", "POST", "PUT", "DELETE"]
}));

// --- 2. REDIS SETUP (From User Service) ---
export const redisClient = createClient({
    url: process.env.REDIS_URL as string || 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.log('❌ Redis Client Error', err));

// --- 3. HEALTH CHECK (For Cron Job) ---
// This simple route keeps the server awake
app.get("/", (req, res) => {
    res.status(200).send("✅ ZenChat Monolith is Active");
});

// --- 4. MERGED ROUTES ---
// Mount both services on the same app
app.use("/api/v1/chat", chatRoutes); // Chat Endpoints
app.use("/api/v1/user", userRoutes); // User Endpoints

const PORT = process.env.PORT || 5000;

// --- 5. ROBUST SERVER STARTUP ---
const startServer = async () => {
    try {
        console.log("⏳ Starting ZenChat Monolith...");

        // A. Connect to Database
        await connectDb();
        console.log("✅ Connected to MongoDB");

        // B. Connect to Redis
        await redisClient.connect();
        console.log("✅ Connected to Redis");

        // C. Connect to RabbitMQ (Producer)
        await connectRabbitMQ();
        
        // D. Start Mail Worker (Consumer) - Runs in background
        // We use .catch() so a mail error doesn't crash the whole server
        startSendOtpConsumer().catch(err => console.error("⚠️ Mail Worker Warning:", err));
        
        // E. Start the HTTP + Socket Server
        server.listen(PORT, () => {
            console.log(`🚀 -----------------------------------------`);
            console.log(`🚀 Monolith Server running on port ${PORT}`);
            console.log(`🚀 Socket.io is active`);
            console.log(`🚀 -----------------------------------------`);
        });

    } catch (error) {
        console.error("❌ Critical Startup Error:", error);
        process.exit(1);
    }
};

startServer();