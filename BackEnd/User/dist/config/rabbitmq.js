import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config();
let channel;
export const connectRabbitMQ = async () => {
    try {
        // CHANGED: Use the full Cloud connection string from Render
        // This replaces the manual protocol/hostname/username/password object
        const connection = await amqp.connect(process.env.Rabbitmq_Host || "");
        channel = await connection.createChannel();
        console.log("✅ connected to rabbitmq");
    }
    catch (error) {
        console.log("Failed to connect to rabbitmq", error);
    }
};
export const publishtoQueue = async (queueName, message) => {
    if (!channel) {
        console.log("Rabbit channel is not initallized");
        return;
    }
    await channel.assertQueue(queueName, { durable: true });
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)), { persistent: true });
};
//# sourceMappingURL=rabbitmq.js.map