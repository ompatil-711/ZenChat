import amqp from 'amqplib';
import { Resend } from 'resend'; 
import dotenv from 'dotenv';

dotenv.config();

export const startSendOtpConsumer = async () => {
    try {
        console.log("🔌 Connecting to RabbitMQ...");

        // --- 1. DEBUGGING: Check if Key Exists ---
        if (!process.env.RESEND_API_KEY) {
            console.error("❌ CRITICAL ERROR: RESEND_API_KEY is undefined!");
            return; // Stop here if key is missing (no point retrying)
        }
        
        // --- 2. Initialize Resend ---
        const resend = new Resend(process.env.RESEND_API_KEY);

        const url = process.env.Rabbitmq_Host || "amqp://localhost";
        
        // --- 3. Connect to RabbitMQ ---
        const connection = await amqp.connect(url);

        // --- 4. ERROR HANDLING: Auto-Reconnect Listeners ---
        connection.on("error", (err) => {
            console.error("❌ RabbitMQ Connection Error:", err);
            setTimeout(startSendOtpConsumer, 5000); // Retry after 5s
        });

        connection.on("close", () => {
            console.warn("⚠️ RabbitMQ Connection Closed. Reconnecting...");
            setTimeout(startSendOtpConsumer, 5000); // Retry after 5s
        });

        const channel = await connection.createChannel();
        const queueName = "send-otp";

        await channel.assertQueue(queueName, { durable: true });

        // --- 5. CRITICAL: Prefetch(1) prevents Rate Limit crashes ---
        channel.prefetch(1);

        console.log("✅ Mail service consumer started (Using Resend API)");

        // --- 6. Start Consuming ---
        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📨 Received request to send to: ${content.to}`);

                    // Send Email
                    const { data, error } = await resend.emails.send({
                        from: 'ZenChat Support <noreply@zenchat.online>', 
                        to: [content.to], 
                        subject: content.subject,
                        html: `<p>${content.body}</p>`, 
                    });

                    if (error) {
                        console.error("❌ Resend API Error:", error);
                        // We still ACK to prevent infinite loop of "Rate Limit" errors
                        channel.ack(msg); 
                    } else {
                        console.log(`✅ Email sent successfully! ID: ${data?.id}`);
                        channel.ack(msg);
                    }
                    
                } catch (err) {
                    console.error("❌ Fatal Error processing message:", err);
                    // Always ACK bad messages so they don't block the queue
                    channel.ack(msg);
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to start rabbitmq consumer:", error);
        // --- 7. RECURSIVE RETRY: Try again if initial connection fails ---
        console.log("🔄 Retrying connection in 5 seconds...");
        setTimeout(startSendOtpConsumer, 5000);
    }
};