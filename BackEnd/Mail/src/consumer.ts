import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const startSendOtpConsumer = async () => {
    try {
        const url = process.env.Rabbitmq_Host || "";
        console.log(`🔌 Connecting to RabbitMQ...`);

        const connection = await amqp.connect(url);
        const channel = await connection.createChannel();
        const queueName = "send-otp"; // Ensure this matches exactly

        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started, listening for otp emails");

        // --- UPDATED TRANSPORTER WITH DEBUGGING ---
        const transporter = nodemailer.createTransport({
            service: "gmail", // Use the built-in 'gmail' service shortcut
            auth: {
                user: process.env.GMAIL_USER, // Ensure this matches Dashboard Variable
                pass: process.env.GMAIL_PASS, // Ensure this matches Dashboard Variable
            },
            logger: true, // Log to console
            debug: true   // Include SMTP traffic in logs
        });

        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📨 Received request to send to: ${content.to}`);

                    const info = await transporter.sendMail({
                        from: `"ZenChat Support" <${process.env.GMAIL_USER}>`,
                        to: content.to,
                        subject: content.subject,
                        text: content.body,
                    });
                    
                    console.log(`✅ Email sent: ${info.messageId}`);
                    channel.ack(msg);

                } catch (emailError: any) {
                    // PRINT THE EXACT ERROR
                    console.error("❌ FATAL EMAIL ERROR:", emailError.message);
                    if (emailError.response) console.error("SMTP Response:", emailError.response);
                    
                    // We ack the message so it doesn't crash the loop, 
                    // but you might want to 'nack' it in production to retry.
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to start rabbitmq consumer:", error);
    }
};