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
        // Ensure this string matches your User Service exactly
        const queueName = "send-otp"; 

        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started, listening for otp emails");

        // --- FIX: Force Port 587 for Cloud Deployment ---
        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,            // Standard TLS port
            secure: false,        // Must be false for port 587
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS,
            },
            tls: {
                rejectUnauthorized: false // Helps avoid SSL errors on Render
            },
            logger: true, // Keep logs on to debug
            debug: true   // Keep debug on to see SMTP traffic
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
                    // Ack the message so we don't get stuck in a loop, 
                    // but log the error clearly.
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.error("❌ Failed to start rabbitmq consumer:", error);
    }
};