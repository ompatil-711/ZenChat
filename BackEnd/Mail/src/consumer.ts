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
        console.log("✅ Mail service consumer started, listening for otp emails");

        // --- FINAL FIX: Port 465 (SSL) + Timeouts ---
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 465,            // Use SSL Port (Best for Render/Cloud)
            secure: true,         // Must be TRUE for port 465
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false // Helps avoid SSL certificate errors
            },
            // timeouts to prevent hanging
            connectionTimeout: 10000, // 10 seconds
            greetingTimeout: 10000,
            socketTimeout: 10000,
            
            logger: true, // Keep logs on
            debug: true   // Keep debug on
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
                    
                    console.log(`✅ Email sent successfully: ${info.messageId}`);
                    channel.ack(msg);

                } catch (emailError: any) {
                    console.error("❌ FATAL EMAIL ERROR:", emailError.message);
                    if (emailError.response) {
                        console.error("SMTP Response:", emailError.response);
                    }
                    if (emailError.code === 'ETIMEDOUT') {
                         console.error("⚠️ Connection Timed Out. Firewalls might be blocking port 465.");
                    }
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to start rabbitmq consumer:", error);
    }
};