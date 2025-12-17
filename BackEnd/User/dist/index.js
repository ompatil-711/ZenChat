import express from "express";
import dotenv from 'dotenv';
import connectDb from "./config/db.js";
import { createClient } from 'redis';
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import cors from 'cors';
dotenv.config();
// 1. Export Redis Client so controllers can use it
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
const app = express();
// 2. FIXED: cors() must be a function call!
app.use(cors());
// 3. JSON Middleware
app.use(express.json());
// 4. Routes (Note: Your URL is now http://localhost:PORT/api/v1/...)
app.use("/api/v1", userRoutes);
const port = process.env.PORT || 5000;
// 5. Robust Server Startup
// We use a function to ensure DB & Redis connect BEFORE the server starts
const startServer = async () => {
    try {
        // Connect Database
        await connectDb();
        console.log("✅ Connected to MongoDB");
        // Connect Redis
        await redisClient.connect();
        console.log("✅ Connected to Redis");
        // Connect RabbitMQ
        await connectRabbitMQ();
        console.log("✅ Connected to RabbitMQ");
        // Start Server only after connections are success
        app.listen(port, () => {
            console.log(`🚀 Server is running on port ${port}`);
        });
    }
    catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
//# sourceMappingURL=index.js.map