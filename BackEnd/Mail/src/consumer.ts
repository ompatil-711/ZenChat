import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export const startSendOtpConsumer = async () => {
    try {
        const url = process.env.Rabbitmq_Host || "";
        console.log(`🔌 Connecting to RabbitMQ at: ${url.split('@')[1] || 'localhost'}`); // Logs host only for security

        const connection = await amqp.connect(url);
        const channel = await connection.createChannel();
        const queueName = "send-otp";

        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started, listening for otp emails");

        const transporter = nodemailer.createTransport({
            pool: true,
            maxConnections: 1,
            rateLimit: 1,
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.GMAIL_USER, // UPDATED: Avoids system var conflict
                pass: process.env.GMAIL_PASS, // UPDATED
            },
            tls: {
                rejectUnauthorized: false
            },
            family: 4
        } as any);

        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const { to, subject, body } = JSON.parse(msg.content.toString());
                    console.log(`📨 Attempting to send email to: [${to}]`);

                    if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
                        console.error("❌ ERROR: GMAIL_USER or GMAIL_PASS env vars are missing!");
                        channel.ack(msg);
                        return;
                    }

                    await transporter.sendMail({
                        from: `"ZenChat Support" <${process.env.GMAIL_USER}>`,
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
        console.error("❌ Failed to start rabbitmq consumer:", error);
    }
};