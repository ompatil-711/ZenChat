import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";
import { User } from "./entities/User.entity.js";
import { Conversation } from "./entities/Conversation.entity.js";
import { ConversationMember } from "./entities/ConversationMember.entity.js";
import { Message } from "./entities/Message.entity.js";
import { InitialSchema1792494000000 } from "./migrations/1792494000000-InitialSchema.js";

const connectionUrl = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : undefined;
const useTls = process.env.DATABASE_SSL === "true" || (!!connectionUrl?.searchParams.get("sslmode") && connectionUrl.searchParams.get("sslmode") !== "disable");
// Pass TLS options explicitly: pg URL sslmode options otherwise replace the SSL object.
connectionUrl?.searchParams.delete("sslmode");

export const AppDataSource = new DataSource({
  type: "postgres",
  url: connectionUrl?.toString(),
  entities: [User, Conversation, ConversationMember, Message],
  migrations: [InitialSchema1792494000000],
  synchronize: false,
  migrationsRun: false,
  ssl: useTls ? { rejectUnauthorized: true } : false,
  extra: { max: 5, connectionTimeoutMillis: 10000, statement_timeout: 10000, idleTimeoutMillis: 30000 },
  logging: false,
});

export async function initializeDatabase() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required. Configure PostgreSQL and run migrations first.");
  if (!AppDataSource.isInitialized) await AppDataSource.initialize();
  if (await AppDataSource.showMigrations()) throw new Error("Database migrations are pending. Run the database migration:run command.");
  return AppDataSource;
}

