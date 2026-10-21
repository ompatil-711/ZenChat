import type { User } from "./entities/User.entity.js";
import type { Message } from "./entities/Message.entity.js";

export interface PublicUser { _id: string; name: string; email: string }
export const publicUser = (user: User): PublicUser => ({ _id: user.id, name: user.name, email: user.email });
export const publicMessage = (message: Message) => ({
  _id: message.id, chatId: message.conversationId, sender: message.senderId,
  text: message.text ?? "", messageType: message.imageUrl ? "image" as const : "text" as const,
  ...(message.imageUrl ? { image: { url: message.imageUrl, publicId: message.imagePublicId } } : {}),
  seen: message.seen, seenAt: message.seenAt, createdAt: message.createdAt,
});
export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
export function directKey(first: string, second: string) {
  if (!isUuid(first) || !isUuid(second) || first.toLowerCase() === second.toLowerCase()) throw new Error("Two distinct valid participant IDs are required");
  return [first.toLowerCase(), second.toLowerCase()].sort().join(":");
}
export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function safeError(error: unknown) {
  // Log useful failure types/codes without connection strings, tokens, or OTPs.
  const item = error as { name?: string; code?: string };
  return { name: item?.name ?? "Error", code: item?.code ?? "UNKNOWN" };
}

