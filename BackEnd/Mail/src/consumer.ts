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
                        channel.ack(msg);
                        return;
                    }

                    // FIX: Added 'as any' to force TypeScript to accept the properties
                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,               // SSL Port (Best for Render)
                        secure: true,            // Must be true for 465
                        auth: {
                            user: process.env.USER,
                            pass: process.env.Password,
                        },
                        tls: {
                            rejectUnauthorized: false
                        },
                        family: 4 // Force IPv4 to prevent timeouts
                    } as any);

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
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};