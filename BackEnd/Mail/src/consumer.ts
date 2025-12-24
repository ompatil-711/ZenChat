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

        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const { to, subject, body } = JSON.parse(msg.content.toString());
                    console.log(`📨 Attempting to send email to: [${to}]`);

                    if (!process.env.USER || !process.env.Password) {
                        console.error("❌ ERROR: USER or Password env vars are missing!");
                        // We ack here to remove the bad message and prevent retries
                        channel.ack(msg);
                        return;
                    }

                    // FIX: Pure SMTP configuration (No 'service' property to avoid TS errors)
                    const transporter = nodemailer.createTransport({
                        host: "smtp.googlemail.com", // Alternate Google host
                        port: 587,
                        secure: false, // Must be false for port 587
                        auth: {
                            user: process.env.USER,
                            pass: process.env.Password,
                        },
                        tls: {
                            rejectUnauthorized: false // Fixes Render certificate issues
                        },
                        connectionTimeout: 20000, // 20 seconds
                    });

                    await transporter.sendMail({
                        from: `"ZenChat Support" <${process.env.USER}>`,
                        to,
                        subject,
                        text: body,
                    });
                    
                    console.log(`✅ OTP mail sent successfully to ${to}`);
                    channel.ack(msg);

                } catch (emailError) {
                    console.error("❌ Failed to send otp:", emailError);
                    
                    // CRITICAL: We acknowledge the message even on failure.
                    // This STOPS the infinite loop that was causing Google to block you.
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};