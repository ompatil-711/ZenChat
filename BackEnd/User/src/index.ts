import express from "express";
import dotenv from 'dotenv';
import connectDb from "./config/db.js";
// 👇 THE FIX: Added 'type' keyword before RedisClientType
import { createClient, type RedisClientType } from 'redis'; 
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";
import cors from 'cors';

dotenv.config();

const app = express();

// 1. CORS Configuration
app.use(cors({
  origin: "*", 
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// --- 👇 CRON JOB HEALTH CHECK 👇 ---
app.get("/", (req, res) => {
    res.status(200).send("OK");
});
// ----------------------------------

// 2. Redis Client Setup
const redisUrl = process.env.REDIS_URL;

// Explicitly type the variable
let redisClient: RedisClientType | undefined; 

if (redisUrl) {
    redisClient = createClient({ url: redisUrl });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
} else {
    console.warn("⚠️ WARNING: REDIS_URL is missing! Redis features will fail.");
}

export { redisClient };

// 3. Routes
app.use("/api/v1/user", userRoutes);

const port = process.env.PORT || 5000;

// 4. Server Startup
const startServer = async () => {
    try {
        await connectDb();
        console.log("✅ Connected to MongoDB");

        if (redisClient) {
            await redisClient.connect();
            console.log("✅ Connected to Redis");
        }

        await connectRabbitMQ();
        console.log("✅ Connected to RabbitMQ");

        app.listen(port, () => {
            console.log(`🚀 Server is running on port ${port}`);
        });

    } catch (error) {
        console.error("❌ Failed to start server:", error);
        process.exit(1);
    }
};

startServer();