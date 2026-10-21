import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("conversations")
export class Conversation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  // Sorted participant IDs enforce one direct conversation per pair, including concurrent requests.
  @Column({ type: "varchar", length: 73, unique: true }) directKey!: string;
  @Column({ type: "text", nullable: true }) latestText!: string | null;
  @Column({ type: "uuid", nullable: true }) latestSenderId!: string | null;
  @CreateDateColumn({ type: "timestamptz" }) createdAt!: Date;
  @UpdateDateColumn({ type: "timestamptz" }) updatedAt!: Date;
}

