import amqp from 'amqplib';
import { Resend } from 'resend'; 
import dotenv from 'dotenv';
dotenv.config();

export const startSendOtpConsumer = async () => {
    try {
        console.log("🔌 Connecting to RabbitMQ...");

        // --- DEBUGGING: Check if Key Exists ---
        if (!process.env.RESEND_API_KEY) {
            console.error("❌ CRITICAL ERROR: RESEND_API_KEY is undefined!");
            console.error("👉 Please check your Render Dashboard > Environment Variables.");
            return; // Stop here to prevent crash
        }
        
        // --- Initialize Resend ---
        const resend = new Resend(process.env.RESEND_API_KEY);

        const url = process.env.Rabbitmq_Host || "";
        const connection = await amqp.connect(url);
        const channel = await connection.createChannel();
        const queueName = "send-otp";

        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started (Using Resend API)");

        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📨 Received request to send to: ${content.to}`);

                    const { data, error } = await resend.emails.send({
                        // 👇 UPDATED: Uses your new verified domain
                        from: 'ZenChat Support <noreply@zenchat.online>', 
                        to: [content.to], 
                        subject: content.subject,
                        html: `<p>${content.body}</p>`, 
                    });

                    if (error) {
                        console.error("❌ Resend API Error:", error);
                    } else {
                        console.log(`✅ Email sent successfully! ID: ${data?.id}`);
                    }
                    
                    channel.ack(msg);

                } catch (err) {
                    console.error("❌ Fatal Error processing message:", err);
                    channel.ack(msg);
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to start rabbitmq consumer:", error);
    }
};