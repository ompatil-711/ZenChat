import express from "express";
import dotenv from "dotenv";
import { startSendOtpConsumer } from "./consumer.js";
import cors from 'cors';
dotenv.config();
startSendOtpConsumer();
const app = express();
app.use(cors({
    origin: "http://localhost:3000", // Allow your Next.js Frontend
    credentials: true, // Allow cookies/tokens to be sent
    methods: ["GET", "POST", "PUT", "DELETE"]
}));
app.use(express.json());
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
});
//# sourceMappingURL=index.js.map