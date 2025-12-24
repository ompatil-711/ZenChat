import express from "express";
import dotenv from 'dotenv';
import connectDb from "./config/db.js";
import { createClient } from 'redis';
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js"; // This imports the logic
import cors from 'cors';
dotenv.config();
// 1. Redis Client 
// (Make sure you add a REDIS_URL environment variable in Render if you use Redis)
export const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
});
redisClient.on('error', (err) => console.log('Redis Client Error', err));
const app = express();
// 2. REQUIRED UPDATE: Fix CORS to allow Render Frontend
// Changed origin to "*" to allow your deployed frontend to access this backend
app.use(cors({
    origin: "*",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"]
}));
// 3. JSON Middleware
app.use(express.json());
// 4. Routes
app.use("/api/v1/user", userRoutes);
const port = process.env.PORT || 5000;
// 5. Server Startup
const startServer = async () => {
    try {
        await connectDb();
        console.log("✅ Connected to MongoDB");
        await redisClient.connect();
        console.log("✅ Connected to Redis");
        // This calls the function in your config file
        await connectRabbitMQ();
        console.log("✅ Connected to RabbitMQ");
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