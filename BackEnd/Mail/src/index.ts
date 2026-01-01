import express from "express";
import dotenv from "dotenv";
import { startSendOtpConsumer } from "./consumer.js"; 
import cors from 'cors';

dotenv.config();

const app = express();

// 1. FIX: Allow production domains (or "*" for open access)
app.use(cors({
  origin: "*", // 👈 Allows Cron Job & Live Frontend to connect
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

// 2. FIX: Keep response tiny for Cron Job
app.get("/", (req, res) => {
    res.status(200).send("OK");
});

// ----------------------------------------------

// Start the RabbitMQ Consumer
// 3. FIX: Catch errors so the server doesn't crash if RabbitMQ is down
startSendOtpConsumer().catch((err) => {
    console.error("⚠️ Failed to start RabbitMQ Consumer:", err);
});

const PORT = process.env.PORT || 5001; 

app.listen(PORT, () => {
    console.log(`🚀 Mail Service Server is running on port ${PORT}`);
});