# ZenChat

A TypeScript chat application with a Next.js frontend, PostgreSQL/TypeORM, Socket.IO, Redis OTP verification, and an SMTP mail worker.

## Services 

| Directory | Responsibility | Local port |
| --- | --- | --- |
| `frontend` | Next.js 16 / React 19 / Tailwind 4 | 3000 |
| `BackEnd/User` | OTP login, JWT sessions, user profiles | 5000 |
| `BackEnd/Chat` | Conversation/message API and authenticated Socket.IO | 5001 |
| `BackEnd/Mail` | AMQP consumer and Nodemailer SMTP delivery | 5002 |
| `BackEnd/database` | Shared TypeORM entities, DataSource, migrations, database tests | — |

User and Chat intentionally share one PostgreSQL schema and one database package. This makes relational constraints straightforward, but couples schema changes across the services. Mail does not need PostgreSQL.

The AMQP publisher and worker work with RabbitMQ or LavinMQ using `amqplib`; the currently configured hosted broker is LavinMQ.

## Initial setup

Use Node.js 22 or later. Each directory has its own npm lockfile.

1. Create a PostgreSQL database (Neon is supported). Configure the same `DATABASE_URL` in `BackEnd/database/.env`, `BackEnd/User/.env`, and `BackEnd/Chat/.env`.
2. Set `DATABASE_SSL=true` for a hosted TLS database. Certificates are verified.
3. Create a Redis database and configure `REDIS_URL` in User. Use the TCP/TLS `rediss://` URL, not an HTTP REST endpoint.
4. Configure the same `Rabbitmq_Host` AMQP URL (including virtual host) in User and Mail.
5. Configure Gmail with a Google App Password in Mail, or configure a different SMTP provider.
6. Copy the provided `.env.example` files to ignored `.env` files as needed; never commit credentials.

From the repository root, install/build the shared database package first:

```powershell
npm --prefix BackEnd/database ci
npm --prefix BackEnd/database run build
npm --prefix BackEnd/User ci
npm --prefix BackEnd/Chat ci
npm --prefix BackEnd/Mail ci
npm --prefix frontend ci
npm --prefix BackEnd/database run migration:run
```

Run these in separate terminals:

```powershell
npm --prefix BackEnd/User run dev
npm --prefix BackEnd/Chat run dev
npm --prefix BackEnd/Mail run dev
npm --prefix frontend run dev
```

Backend development uses one `tsx` watcher per service. User/Chat build the shared database package before starting. Restart those services after editing shared entities or database code.

The frontend defaults to local User/Chat URLs. Production deployments must explicitly set both `NEXT_PUBLIC_USER_BACKEND_URL` and `NEXT_PUBLIC_CHAT_BACKEND_URL` before building.

## Database tables

The `BackEnd/database/src/entities` folder contains:
- `User.entity.ts` → `users`: normalized unique email and profile.
- `Conversation.entity.ts` → `conversations`: one direct conversation per canonical user pair.
- `ConversationMember.entity.ts` → `conversation_members`: membership and read timestamp.
- `Message.entity.ts` → `messages`: text/image content, sender, timestamps, and direct-chat read status.

Foreign keys enforce participant references; a composite foreign key prevents a nonmember from being a message sender. Message history uses indexed cursor pagination. PostgreSQL timestamp precision is preserved in pagination cursors.

Schema synchronization is disabled. Run reviewed migrations explicitly once per release; do not run migrations separately from every service replica. A fresh PostgreSQL database does not import or delete existing MongoDB data. Old sessions must log in again after migration.

## Checks

```powershell
npm --prefix BackEnd/database run build
npm --prefix BackEnd/User run build
npm --prefix BackEnd/Chat run build
npm --prefix BackEnd/Mail run build
npm --prefix frontend run lint
npm --prefix frontend run build
npm --prefix BackEnd/database test
npm --prefix BackEnd/User test
npm --prefix BackEnd/Mail test
npm --prefix BackEnd/Chat test
```

Database-dependent tests are opt-in. They require the configured database, create only test fixtures, and roll back or delete them. No SMTP email is sent by tests.

```powershell
$env:RUN_DB_TESTS="1"
npm --prefix BackEnd/database test
npm --prefix BackEnd/Chat test
Remove-Item Env:RUN_DB_TESTS
```

User's Redis integration tests use `RUN_REDIS_TESTS=1`; its live API tests use
`RUN_API_TESTS=1`. Run `npm --prefix BackEnd/User test` with those flags to check
atomic OTP verification and dependency readiness without sending mail.

Check a newly configured Redis connection with `npm --prefix BackEnd/User run redis:verify`.

Verify SMTP without sending an email:

```powershell
npm --prefix BackEnd/Mail run smtp:verify
```

Each service exposes `/` for liveness and `/health/ready` for dependency readiness. Do not poll readiness aggressively against a sleeping hosted database: database queries keep its compute active.

## Delivery and security behavior

OTP codes expire after five minutes, use cryptographic randomness and HMAC digests in Redis, and allow at most five incorrect attempts. Verification consumes a valid challenge atomically. Login responds only after the broker confirms the email job; this confirms queue acceptance, not inbox delivery.

The mail worker authenticates SMTP before consuming, limits concurrency to one job, retries temporary failures through a delayed queue, and dead-letters invalid/permanently failed jobs. It discards expired OTP jobs. SMTP is inherently at-least-once around crashes; a provider may accept mail before the worker loses its acknowledgement.

HTTP routes and Socket.IO connections use JWT sessions. Chat reads, sends, and room joins require membership. Multiple tabs per user are supported.

## Deployment and pgAdmin

See [deployment setup](docs/DEPLOYMENT.md). pgAdmin can connect to the hosted database; Docker is optional and is not required when using Neon.

`node_modules`, generated output, environment files, and local `AGENTS.md` are ignored. Existing repositories that tracked generated files need index cleanup; ignoring a file does not untrack it.
