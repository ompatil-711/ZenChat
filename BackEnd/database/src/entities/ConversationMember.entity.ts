import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import type { Relation } from "typeorm";
import { User } from "./User.entity.js";
import { Conversation } from "./Conversation.entity.js";

@Entity("conversation_members")
export class ConversationMember {
  @PrimaryColumn("uuid") conversationId!: string;
  @PrimaryColumn("uuid") userId!: string;
  @Column({ type: "timestamptz", nullable: true }) lastReadAt!: Date | null;
  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversationId" }) conversation?: Relation<Conversation>;
  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "userId" }) user?: Relation<User>;
}

