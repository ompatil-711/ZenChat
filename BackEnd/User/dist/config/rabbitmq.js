import amqp from 'amqplib';
let channel;
export const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect({
            protocol: "amqp",
            hostname: process.env.Rabbitmq_Host,
            port: 5672,
            username: process.env.Rabbitmq_Username,
            password: process.env.Rabbitmq_Password,
        });
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