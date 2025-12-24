import amqp from 'amqplib';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();
export const startSendOtpConsumer = async () => {
    try {
        // CHANGED: Use the full secure URL from Render instead of the manual object
        // This is the only way to connect to CloudAMQP securely (amqps://)
        const connection = await amqp.connect(process.env.Rabbitmq_Host || "");
        const channel = await connection.createChannel();
        const queueName = "send-otp";
        await channel.assertQueue(queueName, { durable: true });
        console.log("✅ Mail service consumer started, listening for otp emails");
        // You already added 'any' here, which is perfect!
        channel.consume(queueName, async (msg) => {
            if (msg) {
                try {
                    const { to, subject, body } = JSON.parse(msg.content.toString());
                    const transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 465,
                        auth: {
                            user: process.env.USER,
                            // CHANGED: Updated to 'Password' (Capital P) to match your Render Env variable
                            pass: process.env.Password,
                        }
                    });
                    await transporter.sendMail({
                        from: "ZENCHAT",
                        to,
                        subject,
                        text: body,
                    });
                    console.log(`OTP mail sent to ${to}`);
                    channel.ack(msg);
                }
                catch (emailError) {
                    console.error("Failed to send otp:", emailError);
                }
            }
        });
    }
    catch (error) {
        console.log("Failed to start rabbitmq consumer", error);
    }
};
//# sourceMappingURL=consumer.js.map