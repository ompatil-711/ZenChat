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
        const queueName = "send-otp";

        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started (Using Brevo SMTP)");

        // 1. Configure the Transporter for Brevo
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // Must be false for port 587
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            tls: {
                rejectUnauthorized: false
            }
        });

        channel.consume(queueName, async (msg: any) => {
            if (msg) {
                try {
                    const content = JSON.parse(msg.content.toString());
                    console.log(`📨 Received request to send to: ${content.to}`);

                    // 2. Send the email
                    const info = await transporter.sendMail({
                        from: `"ZenChat Support" <${process.env.SMTP_USER}>`, // THIS MUST MATCH YOUR BREVO LOGIN EMAIL
                        to: content.to,
                        subject: content.subject,
                        html: `<p>${content.body}</p>`,
                    });
                    
                    console.log(`✅ OTP sent via Brevo! ID: ${info.messageId}`);
                    channel.ack(msg);

                } catch (emailError: any) {
                    console.error("❌ Email Error:", emailError.message);
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to start rabbitmq consumer:", error);
    }
};