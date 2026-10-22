# Build from the repository root. SERVICE must be User or Chat.
FROM node:22-bookworm-slim AS database-build
WORKDIR /app/BackEnd/database
COPY BackEnd/database/package*.json ./
RUN npm ci --include=dev
COPY BackEnd/database/tsconfig.json ./
COPY BackEnd/database/src ./src
RUN npm run build

FROM database-build AS database-production
RUN npm prune --omit=dev

# Run this target once per release, separately from application startup.
FROM node:22-bookworm-slim AS migration
ENV NODE_ENV=production
WORKDIR /app/BackEnd/database
COPY --from=database-production /app/BackEnd/database/package*.json ./
COPY --from=database-production /app/BackEnd/database/node_modules ./node_modules
COPY --from=database-production /app/BackEnd/database/dist ./dist
USER node
CMD ["npm", "run", "migration:run"]

FROM database-build AS api-build
ARG SERVICE=User
WORKDIR /app/BackEnd/${SERVICE}
COPY BackEnd/${SERVICE}/package*.json ./
RUN npm ci --include=dev
COPY BackEnd/${SERVICE}/tsconfig.json ./
COPY BackEnd/${SERVICE}/src ./src
RUN npm run build && npm prune --omit=dev
WORKDIR /app/BackEnd/database
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ARG SERVICE=User
ENV NODE_ENV=production PORT=8080
WORKDIR /app/BackEnd/database
COPY --from=api-build /app/BackEnd/database/package*.json ./
COPY --from=api-build /app/BackEnd/database/node_modules ./node_modules
COPY --from=api-build /app/BackEnd/database/dist ./dist
# Keep the sibling directory layout so npm's local database symlink resolves.
WORKDIR /app/BackEnd/${SERVICE}
COPY --from=api-build /app/BackEnd/${SERVICE}/package*.json ./
COPY --from=api-build /app/BackEnd/${SERVICE}/node_modules ./node_modules
COPY --from=api-build /app/BackEnd/${SERVICE}/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
