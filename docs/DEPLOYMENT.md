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

The frontend has no hardcoded backend fallback and does not use the legacy `NEXT_PUBLIC_BACKEND_URL`. For local development, copy `frontend/.env.example` to the ignored `.env.local`; it supplies localhost URLs for `npm run dev`. For Vercel, set both explicit backend variables in the dashboard for each deployed environment to the public HTTPS service roots, then rebuild. Changing dashboard values without rebuilding does not update an existing browser bundle. Production builds and startup reject missing, localhost, loopback/private network, and non-HTTPS URLs. This prevents the known localhost configuration from triggering Chrome's device-access prompt. `npm --prefix frontend run test:config` checks these rules without making requests.

User and Chat require the same JWT secret with at least 32 characters. The apps use a small database connection pool per process. Configure the same broker and virtual host in User and Mail.

## Hosting layout

### Container deployment

The repository includes production images for the three backend processes and a separate migration job. All Docker builds use the **repository root** as the build context. Images run Node.js 22 as the non-root `node` user, contain production dependencies and compiled output, and retain the shared database package's sibling directory layout. `.dockerignore` excludes credentials, local dependencies and generated output from build inputs.

| Process | Dockerfile | Target | Build argument | Public access |
| --- | --- | --- | --- | --- |
| User API | `BackEnd/Dockerfile` | `runtime` | `SERVICE=User` | HTTPS |
| Chat API / Socket.IO | `BackEnd/Dockerfile` | `runtime` | `SERVICE=Chat` | HTTPS and WebSockets |
| Mail consumer | `BackEnd/Mail/Dockerfile` | `runtime` | None | No public endpoint needed |
| Database migration | `BackEnd/Dockerfile` | `migration` | None | None; one-off release job |

Build sequentially from the repository root:

```sh
docker build -f BackEnd/Dockerfile --build-arg SERVICE=User -t zenchat-user .
docker build -f BackEnd/Dockerfile --build-arg SERVICE=Chat -t zenchat-chat .
docker build -f BackEnd/Mail/Dockerfile -t zenchat-mail .
docker build -f BackEnd/Dockerfile --target migration -t zenchat-migrate .
```

Inject environment variables through the hosting dashboard or a private runtime env file. Images default to `PORT=8080`; a host-supplied `PORT` overrides it. Leave the image's default start command intact. No build argument should contain credentials.

Keep User and Chat as separate web services and Mail as an always-running worker. Disable scale-to-zero for the worker: a queued AMQP job cannot wake an HTTP service. Keep Chat at **one replica** until a shared Socket.IO adapter and distributed presence are implemented. Use the host's HTTPS termination and WebSocket support; use `https://` base URLs in the frontend.

### SMTP and hosting plans

Choose the host before provisioning services. Gmail SMTP requires outbound port 465 or 587. Render Free blocks these ports, and Railway currently permits SMTP only on Pro or above. A free API deployment does not establish that the Mail worker can run there. Do not change the application to an HTTP mail API without deciding that separately.

Verify these provider policies before purchase: [Render Free restrictions](https://render.com/docs/free), [Railway SMTP availability](https://docs.railway.com/networking/outbound-networking). No paid resources are provisioned by this repository.

### Release order

1. Build all images for the same Git revision. The `Backend deployment images` GitHub Actions workflow builds all four images and checks production module resolution without credentials or external connections. It does not publish images, run live migrations, or deploy.
2. Confirm Neon backup/recovery coverage before applying a schema change. Supply the migration job with the **direct** Neon `DATABASE_URL` and `DATABASE_SSL=true`. User and Chat can use the pooled connection URL for the same database and branch.
3. Run the migration job once and require a successful exit before releasing User and Chat. For Docker, use `docker run --rm --env-file BackEnd/database/.env zenchat-migrate`. Do not run migrations in each API start command. The current migration creates the initial schema; future rolling releases need backward-compatible migrations.
4. Deploy Mail with broker and SMTP settings. Use its private console to run `node dist/verify-smtp.js` if SMTP diagnosis is needed; verification authenticates without sending mail. Confirm `/health/ready` returns 200 inside the service network.
5. Deploy User and Chat with the same database and JWT secret. Set `FRONTEND_URL` to the exact frontend origins, without trailing slashes or paths. Confirm `/health/ready` returns 200 on each service.
6. Set the frontend's two public backend URLs to the new HTTPS service addresses, then rebuild/redeploy the frontend. These are service roots, without `/api/v1` appended.
7. Exercise login and OTP delivery, then text/image delivery and read receipts between two accounts. Check reconnects and presence. A successful health check alone does not prove these flows.

Use `/` for routine platform liveness checks. Use `/health/ready` after deployments and during diagnosis; frequent database readiness polling can keep Neon awake. Configure restart-on-failure and a graceful termination window of at least 30 seconds. Redact credentials and OTPs from exported logs.

To roll back code, deploy the previous images. Do not automatically revert database migrations: a revert can delete data or break the still-running release.

### Optional local container rehearsal

Start Docker Desktop first. The following uses your existing package `.env` files and hosted dependencies; it does not create local databases. Stop existing User/Chat terminal servers before binding their ports.

```sh
docker compose -f compose.backend.yaml config --quiet
docker compose -f compose.backend.yaml build
docker compose -f compose.backend.yaml --profile release run --rm migrate
docker compose -f compose.backend.yaml up -d user chat mail
docker compose -f compose.backend.yaml ps
docker compose -f compose.backend.yaml logs --tail 50
```

User and Chat bind only to localhost at ports 5000 and 5001. Mail has no published port. `docker compose -f compose.backend.yaml down` stops these local processes; hosted Neon/Redis/AMQP data remains on those providers. This Compose file has no public TLS proxy and is intended for local rehearsal, not direct Internet exposure on a server.

### Native Node deployment alternative

User and Chat depend on `file:../database`. Deploy from the repository checkout with the sibling database directory available; do not upload only the individual service directory.

Example User build command, from the repository root:

```sh
npm --prefix BackEnd/User ci --include=dev && npm --prefix BackEnd/User run build:deploy
```

Start with `npm --prefix BackEnd/User start`. Use the analogous commands for Chat. Mail builds independently. Install devDependencies in the build stage because TypeScript is needed there.

For Render's native Node runtime, leave **Root Directory empty** on User and Chat so the sibling `BackEnd/database` package is available. Use these commands:

| Service | Build Command | Start Command |
| --- | --- | --- |
| User | `npm --prefix BackEnd/User ci --include=dev && npm --prefix BackEnd/User run build:deploy` | `npm --prefix BackEnd/User start` |
| Chat | `npm --prefix BackEnd/Chat ci --include=dev && npm --prefix BackEnd/Chat run build:deploy` | `npm --prefix BackEnd/Chat start` |
| Mail (Root Directory `BackEnd/Mail`) | `npm ci --include=dev && npm run build` | `npm start` |

`build:deploy` installs the shared package's build dependencies. The User/Chat `prebuild` hooks compile that package before compiling the service, so the ignored `database/dist` does not need to be committed. Include `BackEnd/database/**` in any User/Chat build filters. Clear the build cache on the first deployment after correcting these settings. Existing service environment variables stay on their respective services.

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
- Frontend renders without styling: check the emitted stylesheet, not just the build exit status. Tailwind scans `frontend/src` through the CSS-relative `source("../")` in `src/app/globals.css`. Keep the PostCSS plugin configuration independent of bundled `import.meta.url` paths. `npm run build` now checks generated CSS for required layout/color utilities and fails if they are missing. On Vercel, use Root Directory `frontend`, the Next.js framework preset, Build Command `npm run build`, and the default output directory. After deploying this fix, redeploy without the existing build cache and hard-refresh the page.

