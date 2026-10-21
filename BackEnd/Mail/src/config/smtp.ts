import "dotenv/config";
import nodemailer from "nodemailer";

export function createSmtpTransport() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.Password;
  if (!user || !pass) throw new Error("Configure GMAIL_USER and Password (Google App Password), or SMTP_USER and SMTP_PASSWORD.");
  const common = { auth: { user, pass }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000 };
  return {
    sender: { name: "ZenChat Support", address: user },
    transporter: process.env.SMTP_HOST
      ? nodemailer.createTransport({ ...common, host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === "true" })
      : nodemailer.createTransport({ ...common, service: "gmail" }),
  };
}

