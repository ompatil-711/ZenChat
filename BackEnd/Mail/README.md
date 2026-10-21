# Mail worker

The worker consumes durable AMQP queue `send-otp` and sends OTP emails through Nodemailer. RabbitMQ and LavinMQ are supported. No Resend account is needed.

Configure `Rabbitmq_Host`, `GMAIL_USER`, `Password` (Google App Password) and `PORT=5002` in this package's ignored `.env`. User must connect to the same broker and virtual host. For another SMTP provider, use `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASSWORD`.

Build with `npm run build`, then `npm start`. For development use `npm run dev`. Authenticate SMTP without sending a message using `npm run smtp:verify`. Run isolated delivery tests with `npm test`.

The worker verifies SMTP before consuming. Jobs carry `{ to, subject, body, expiresAt, requestId }`. Expired jobs are discarded. Temporary failures use `send-otp.retry` (15-second delay), with at most three delivery attempts; permanent/invalid jobs use `send-otp.failed` (24-hour retention). Replacement jobs must be confirmed by the broker before the original is acknowledged. A single reconnect scheduler avoids duplicate worker connections.

Readiness is available at `/health/ready`. A 200 liveness response at `/` does not imply successful email delivery. SMTP acceptance does not guarantee inbox placement, and delivery around worker crashes is at-least-once.

The hosting platform must permit outbound SMTP. Google App Password setup: https://support.google.com/accounts/answer/185833.

