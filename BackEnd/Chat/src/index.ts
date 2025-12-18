import express from 'express';
import dotenv from 'dotenv';
import connectDb from './config/db.js';
import chatRoutes from './routes/chat.js';


dotenv.config();

// 1. Connect Database
connectDb();

const app = express();

// 2. CRITICAL FIX: Middleware MUST come before Routes!
app.use(express.json()); 

// 3. FIX: Match the URL to your Postman request
// This creates the prefix: http://localhost:PORT/api/v1/chat
app.use("/api/v1/chat", chatRoutes); 

const port = process.env.PORT || 5001; // Ensure this doesn't clash with User service (5000)

app.listen(port, () => {
    console.log(`✅ Server is running on port ${port}`);
});