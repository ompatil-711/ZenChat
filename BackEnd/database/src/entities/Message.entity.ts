import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index, Check } from "typeorm";
import type { Relation } from "typeorm";
import { Conversation } from "./Conversation.entity.js";
import { User } from "./User.entity.js";

@Entity("messages")
@Index("messages_history_idx", ["conversationId", "createdAt", "id"])
@Check("messages_content_check", `length(trim(coalesce("text", ''))) > 0 OR "imageUrl" IS NOT NULL`)
export class Message {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column("uuid") conversationId!: string;
  @Column("uuid") senderId!: string;
  @Column({ type: "text", nullable: true }) text!: string | null;
  @Column({ type: "text", nullable: true }) imageUrl!: string | null;
  @Column({ type: "text", nullable: true }) imagePublicId!: string | null;
  @Column({ type: "boolean", default: false }) seen!: boolean;
  @Column({ type: "timestamptz", nullable: true }) seenAt!: Date | null;
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
  @ManyToOne(() => Conversation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "conversationId" }) conversation?: Relation<Conversation>;
  @ManyToOne(() => User, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "senderId" }) sender?: Relation<User>;
}

