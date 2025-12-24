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

                    // CHANGED: Simplified configuration using 'service: gmail'
                    // This automatically handles the correct ports (587) and security settings
                    const transporter = nodemailer.createTransport({
                        service: 'gmail', 
                        auth: {
                            user: process.env.USER,
                            pass: process.env.Password, 
                        },
                        // Keep debug on so we can see if it works
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