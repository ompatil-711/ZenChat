import type { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1792494000000 implements MigrationInterface {
  name = "InitialSchema1792494000000";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(254) NOT NULL UNIQUE,
        name varchar(80) NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT users_email_normalized CHECK (email = lower(trim(email)))
      );
      CREATE TABLE conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "directKey" varchar(73) NOT NULL UNIQUE,
        "latestText" text,
        "latestSenderId" uuid REFERENCES users(id),
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE conversation_members (
        "conversationId" uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "userId" uuid NOT NULL REFERENCES users(id),
        "lastReadAt" timestamptz,
        PRIMARY KEY ("conversationId", "userId")
      );
      CREATE INDEX members_user_idx ON conversation_members ("userId", "conversationId");
      CREATE TABLE messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "conversationId" uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        "senderId" uuid NOT NULL REFERENCES users(id),
        text text,
        "imageUrl" text,
        "imagePublicId" text,
        seen boolean NOT NULL DEFAULT false,
        "seenAt" timestamptz,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT messages_sender_membership FOREIGN KEY ("conversationId", "senderId")
          REFERENCES conversation_members ("conversationId", "userId"),
        CONSTRAINT messages_content_check CHECK (length(trim(coalesce(text, ''))) > 0 OR "imageUrl" IS NOT NULL)
      );
      CREATE INDEX messages_history_idx ON messages ("conversationId", "createdAt", id);
      CREATE INDEX messages_unread_idx ON messages ("conversationId", "senderId") WHERE NOT seen;
    `);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query("DROP TABLE messages; DROP TABLE conversation_members; DROP TABLE conversations; DROP TABLE users;");
  }
}

