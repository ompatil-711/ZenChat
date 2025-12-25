import amqp from 'amqplib';
import { Resend } from 'resend'; 
import dotenv from 'dotenv';
dotenv.config();

// Initialize Resend with the API Key
const resend = new Resend(process.env.RESEND_API_KEY);

export const startSendOtpConsumer = async () => {
    try {
        const url = process.env.Rabbitmq_Host || "";
        console.log(`🔌 Connecting to RabbitMQ...`);

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

                    // RESEND LOGIC
                    const { data, error } = await resend.emails.send({
                        from: 'ZenChat Support <onboarding@resend.dev>', // Keep this exact email for Free Tier
                        to: [content.to], 
                        subject: content.subject,
                        html: `<p>${content.body}</p>`, 
                    });

                    if (error) {
                        console.error("❌ Resend API Error:", error);
                        // If 403/422 error, it usually means you are sending to an unverified email
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