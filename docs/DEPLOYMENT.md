# Deployment and database access

## Hosted PostgreSQL

Use a PostgreSQL provider's connection string as `DATABASE_URL`. Local development and deployed backends can connect to the same database, but they will share users and messages. Use separate databases/branches once development changes should be isolated.

Set `DATABASE_SSL=true` for Neon. The app verifies TLS certificates; it does not disable certificate checking. Prefer the direct connection for migrations and pgAdmin. A provider's pooled connection can be used by running application services.

Configure these environment variables on the backend host:

| Service | Variables |
| --- | --- |
| User | `DATABASE_URL`, `DATABASE_SSL`, `JWT_SECRET`, `REDIS_URL`, `Rabbitmq_Host`, `FRONTEND_URL`, host-assigned `PORT` |
| Chat | `DATABASE_URL`, `DATABASE_SSL`, same `JWT_SECRET`, `FRONTEND_URL`, Cloudinary credentials, host-assigned `PORT` |
| Mail | `Rabbitmq_Host`, `GMAIL_USER`, `Password`, host-assigned `PORT`; or generic SMTP settings |
| Frontend | `NEXT_PUBLIC_USER_BACKEND_URL`, `NEXT_PUBLIC_CHAT_BACKEND_URL` |

`FRONTEND_URL` is a comma-separated list of allowed origins, such as `https://zenchat.example,http://localhost:3000`. Public frontend URL variables must be configured before the Next.js build. Never expose database, JWT, SMTP, Redis, or broker credentials through `NEXT_PUBLIC_` variables.

User and Chat require the same JWT secret with at least 32 characters. The apps use a small database connection pool per process. Configure the same broker and virtual host in User and Mail.

## Hosting layout

User and Chat depend on `file:../database`. Deploy from the repository checkout with the sibling database directory available; do not upload only the individual service directory.

Example User build command, from the repository root:

```sh
npm --prefix BackEnd/database ci && npm --prefix BackEnd/database run build && npm --prefix BackEnd/User ci && npm --prefix BackEnd/User run build
```

Start with `npm --prefix BackEnd/User start`. Use the analogous commands for Chat. Mail builds independently. Install devDependencies in the build stage because TypeScript is needed there.

Run `npm --prefix BackEnd/database run migration:run` as one release step before starting the updated backends. Keep migration credentials out of logs and never use `synchronize: true` to update a live database. Reverting the initial migration drops its tables and data; do not use it as a routine restart command.

Start the frontend with its host's normal Next.js build/start configuration. The API host must support persistent WebSocket connections. Multiple Chat replicas require a shared Socket.IO adapter/presence strategy; the current implementation targets one Chat process.

## pgAdmin

Register a server using the provider's host, port (normally 5432), database, username, and password. Enable SSL according to the provider instructions. For Neon, use its direct connection details.

After connecting, expand:

`Databases → your database → Schemas → public → Tables`

The four application tables and TypeORM's `migrations` table will appear after migration. A server registered in pgAdmin is a saved connection, not a separately provisioned database server.

## Optional Docker development database

This is optional; skip it when using hosted PostgreSQL.

From `BackEnd/database`, set `POSTGRES_PASSWORD` in its ignored `.env`, then run `docker compose up -d postgres`. Use `DATABASE_SSL=false` and a local PostgreSQL URL in all three database-using env files.

The compose file binds PostgreSQL to localhost and stores data in the named volume. Docker Desktop must run while using this local database. `docker compose stop` retains data; `docker compose down -v` deletes the volume.

## Troubleshooting

- `ENOTFOUND`: the configured hostname does not resolve. Check whether the hosted resource still exists.
- Connection refused: verify the service is listening and the port is correct.
- Pending migrations: build the database package and run its migration command.
- SMTP authentication: use a Google App Password, not your regular account password.
- SMTP connection timeout: confirm the host permits outbound SMTP connections.
- Login loading: inspect the actual login API request URL. Frontend requests now have a 15-second timeout and show network errors.
- CORS: set the exact frontend origin in `FRONTEND_URL` and restart the backend.

