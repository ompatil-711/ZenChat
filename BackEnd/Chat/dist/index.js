import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import chatRoutes from './routes/chat.js';
import cors from 'cors';
import { app, server } from './config/socket.js';
dotenv.config();
// 1. Connect Database
connectDb();
app.use(cors({
    origin: "http://localhost:3000", // Allow your Next.js Frontend
    credentials: true, // Allow cookies/tokens to be sent
    methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());
// 2. CRITICAL FIX: Middleware MUST come before Routes!
app.use(express.json());
// 3. FIX: Match the URL to your Postman request
// This creates the prefix: http://localhost:PORT/api/v1/chat
app.use("/api/v1/chat", chatRoutes);
const port = process.env.PORT || 5001; // Ensure this doesn't clash with User service (5000)
server.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map