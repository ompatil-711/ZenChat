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

                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com", 
                        port: 587,                 // CHANGED: Use Port 587 (TLS)
                        secure: false,             // CHANGED: Must be false for Port 587
                        auth: {
                            user: process.env.USER,
                            pass: process.env.Password, 
                        },
                        // ADDED: Helps prevent handshake errors in cloud environments
                        tls: {
                            rejectUnauthorized: false
                        },
                        logger: true,
                        debug: true 
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
                }
            }
        });

    } catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};