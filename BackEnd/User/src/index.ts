import express from "express";
import dotenv from 'dotenv'
import connectDb from "./config/db.js";
import{createClient} from 'redis'
import userRoutes from "./routes/user.js";
import { connectRabbitMQ } from "./config/rabbitmq.js";

dotenv.config();

connectDb();

connectRabbitMQ();

export const redisClient = createClient({
    url: process.env.REDIS_URL as string,
});

redisClient
        .connect()
        .then(()=> console.log("Connected to redis")).catch(console.error); 
const app = express();

app.use("api/v1", userRoutes)
const port = process.env.PORT;

app.listen(port , () => {
    console.log(`Server is running on port ${port}`)
})
