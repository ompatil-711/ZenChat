import express from "express";
import dotenv from "dotenv";
import { startSendOtpConsumer } from "./consumer.js"; 
import cors from 'cors';

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:3000", 
  credentials: true, 
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send("✅ Mail Service is Running...");
});
// ----------------------------------------------

// Start the RabbitMQ Consumer
startSendOtpConsumer();

const PORT = process.env.PORT || 5001; // Good practice to have a fallback

app.listen(PORT, () => {
    console.log(`🚀 Mail Service Server is running on port ${PORT}`);
});