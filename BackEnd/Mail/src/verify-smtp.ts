import { createSmtpTransport } from "./config/smtp.js";
const { transporter } = createSmtpTransport();
try { await transporter.verify(); console.log("SMTP connection and authentication verified. No email sent."); }
catch (error) {
  const e = error as { code?: string; responseCode?: number };
  console.error("SMTP verification failed", { code: e.code, responseCode: e.responseCode });
  process.exitCode = 1;
} finally { transporter.close(); }

