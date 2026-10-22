FROM node:22-bookworm-slim AS build
WORKDIR /app/BackEnd/Mail
COPY BackEnd/Mail/package*.json ./
RUN npm ci --include=dev
COPY BackEnd/Mail/tsconfig.json ./
COPY BackEnd/Mail/src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app/BackEnd/Mail
COPY --from=build /app/BackEnd/Mail/package*.json ./
COPY --from=build /app/BackEnd/Mail/node_modules ./node_modules
COPY --from=build /app/BackEnd/Mail/dist ./dist
USER node
EXPOSE 8080
CMD ["node", "dist/index.js"]
