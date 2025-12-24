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

                    // FIX 1: Cast to 'any' to fix the TypeScript "service does not exist" error
                    const transporter = nodemailer.createTransport({
                        service: 'gmail', 
                        auth: {
                            user: process.env.USER,
                            pass: process.env.Password,
                        },
                        // FIX 2: FORCE IPv4. This solves the "Timeout" on Render/Google connections.
                        family: 4, 
                        logger: true,
                        debug: true 
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
                    // ACK the message to stop the infinite retry loop
                    channel.ack(msg); 
                }
            }
        });

    } catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};