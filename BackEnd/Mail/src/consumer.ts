import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const startSendOtpConsumer = async () => {
    try {
        const connection = await amqp.connect(process.env.Rabbitmq_Host || "");
        const channel = await connection.createChannel();
        const queueName = "send-otp";

        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started, listening for otp emails");

        // CONFIGURATION: Gentle connection pool to avoid Google Blocks
        const transporter = nodemailer.createTransport({
            pool: true,              // Reuses the connection
            maxConnections: 1,       // Only 1 connection at a time
            rateLimit: 1,            // Only 1 email per second (Throttling)
            host: "smtp.gmail.com",
            port: 465,               // SSL Port (Best for Render)
            secure: true,            // True for 465
            auth: {
                user: process.env.USER,
                pass: process.env.Password, // Your App Password
            },
            tls: {
                rejectUnauthorized: false
            },
            family: 4 // Force IPv4 to prevent IPv6 Timeouts
        } as any);

        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const { to, subject, body } = JSON.parse(msg.content.toString());
                    console.log(`📨 Attempting to send email to: [${to}]`);

                    if (!process.env.USER || !process.env.Password) {
                        console.error("❌ ERROR: USER or Password env vars are missing!");
                        channel.ack(msg); // Remove bad message
                        return;
                    }

                    await transporter.sendMail({
                        from: `"ZenChat Support" <${process.env.USER}>`,
                        to,
                        subject,
                        text: body,
                    });
                    
                    console.log(`✅ OTP mail sent successfully to ${to}`);
                    
                    // SUCCESS: Remove message from queue
                    channel.ack(msg);

                } catch (emailError) {
                    console.error("❌ Failed to send otp (Removing from queue to stop loop):", emailError);
                    
                    // *** CRITICAL FIX *** // We acknowledge the message even if it FAILS.
                    // This deletes it from RabbitMQ so it doesn't retry instantly.
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};