import { AppDataSource, User, Conversation, ConversationMember, Message, HttpError, isUuid, directKey, publicMessage, publicUser } from "@zenchat/database";
import TryCatch from "../config/TryCatch.js";
import { io, isUserInChat } from "../config/socket.js";
import cloudinary from "../config/cloudinary.js";
export const createNewChat = TryCatch(async (req, res) => {
  const userId = req.user!._id;
  const otherUserId: unknown = typeof req.body?.otherUserId === "string" ? req.body.otherUserId.toLowerCase() : undefined;
  if (!isUuid(otherUserId) || otherUserId === userId) throw new HttpError(400, "Select another valid user.");
  const chatId = await AppDataSource.transaction(async manager => {
    if (!await manager.getRepository(User).existsBy({ id: otherUserId })) throw new HttpError(404, "User not found.");
    const key = directKey(userId, otherUserId);
    await manager.getRepository(Conversation).createQueryBuilder().insert().values({ directKey: key }).orIgnore().execute();
    const chat = await manager.getRepository(Conversation).findOneByOrFail({ directKey: key });
    await manager.getRepository(ConversationMember).createQueryBuilder().insert().values([
      { conversationId: chat.id, userId }, { conversationId: chat.id, userId: otherUserId },
    ]).orIgnore().execute();
    return chat.id;
  });
  io.to(userId).to(otherUserId).emit("chatCreated");
  res.status(201).json({ message: "Conversation ready", chatId });
});
interface ChatRow {
  id: string; createdAt: Date; updatedAt: Date; latestText: string | null; latestSenderId: string | null;
  userId: string; name: string; email: string; unseenCount: string;
}
export const getAllChats = TryCatch(async (req, res) => {
  const rows = await AppDataSource.query<ChatRow[]>(`
    SELECT c.*, u.id AS "userId", u.name, u.email,
      (SELECT count(*) FROM messages m WHERE m."conversationId" = c.id AND m."senderId" <> $1 AND NOT m.seen) AS "unseenCount"
    FROM conversations c
    JOIN conversation_members mine ON mine."conversationId" = c.id AND mine."userId" = $1
    JOIN conversation_members other ON other."conversationId" = c.id AND other."userId" <> $1
    JOIN users u ON u.id = other."userId"
    ORDER BY c."updatedAt" DESC, c.id DESC LIMIT 500
  `, [req.user!._id]);
  res.json({ chats: rows.map(row => ({
    _id: row.id, user: { _id: row.userId, name: row.name, email: row.email },
    chat: { _id: row.id, users: [req.user!._id, row.userId], createdAt: row.createdAt, updatedAt: row.updatedAt,
      latestMessage: row.latestSenderId ? { text: row.latestText, sender: row.latestSenderId } : null,
      unseenCount: Number(row.unseenCount) },
  })) });
});
export const sendMessage = TryCatch(async (req, res) => {
  let saved = false;
  try {
    const senderId = req.user!._id;
    const chatId: unknown = req.body?.chatId;
    const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
    if (!isUuid(chatId)) throw new HttpError(400, "Invalid conversation.");
    if (text.length > 5000) throw new HttpError(400, "Messages may contain at most 5000 characters.");
    if (!text && !req.file) throw new HttpError(400, "Text or an image is required.");
    const result = await AppDataSource.transaction(async manager => {
      const chat = await manager.getRepository(Conversation).findOne({ where: { id: chatId }, lock: { mode: "pessimistic_write" } });
      if (!chat) throw new HttpError(404, "Conversation not found.");
      const members = await manager.getRepository(ConversationMember).findBy({ conversationId: chatId });
      if (!members.some(member => member.userId === senderId)) throw new HttpError(403, "You are not a participant.");
      const other = members.find(member => member.userId !== senderId);
      if (!other) throw new HttpError(400, "Conversation has no recipient.");
      const seen = isUserInChat(other.userId, chatId);
      const message = manager.getRepository(Message).create({
        conversationId: chatId, senderId, text: text || null,
        imageUrl: req.file?.path ?? null, imagePublicId: req.file?.filename ?? null,
        seen, seenAt: seen ? new Date() : null,
      });
      await manager.getRepository(Message).save(message);
      chat.latestText = req.file ? "📷 Image" : text;
      chat.latestSenderId = senderId;
      await manager.getRepository(Conversation).save(chat);
      return { message, otherId: other.userId };
    });
    saved = true;
    const message = publicMessage(result.message);
    io.to(senderId).to(result.otherId).emit("newMessage", message);
    if (result.message.seen) io.to(senderId).emit("messagesSeen", { chatId, seenBy: result.otherId, messageIds: [result.message.id] });
    res.status(201).json({ message, sender: senderId });
  } finally {
    if (!saved && req.file?.filename) await cloudinary.uploader.destroy(req.file.filename).catch(() => {});
  }
});
export const getMessagesByChat = TryCatch(async (req, res) => {
  const chatId = req.params.chatId;
  const userId = req.user!._id;
  if (!isUuid(chatId)) throw new HttpError(400, "Invalid conversation.");
  let cursor: { date: string; id: string } | undefined;
  if (typeof req.query.before === "string") {
    try {
      const decoded = JSON.parse(Buffer.from(req.query.before, "base64url").toString()) as { date: string; id: string };
      if (!isUuid(decoded.id) || !Number.isFinite(Date.parse(decoded.date))) throw new Error("Invalid cursor");
      cursor = decoded;
    } catch { throw new HttpError(400, "Invalid pagination cursor."); }
  }
  const limit = 50;
  const result = await AppDataSource.transaction(async manager => {
    const chat = await manager.getRepository(Conversation).findOne({ where: { id: chatId }, lock: { mode: "pessimistic_write" } });
    if (!chat) throw new HttpError(404, "Conversation not found.");
    const members = await manager.getRepository(ConversationMember).findBy({ conversationId: chatId });
    if (!members.some(member => member.userId === userId)) throw new HttpError(403, "You are not a participant.");
    const other = members.find(member => member.userId !== userId)!;
    const updated: { id: string }[] = await manager.query(
      'UPDATE messages SET seen = true, "seenAt" = now() WHERE "conversationId" = $1 AND "senderId" <> $2 AND NOT seen RETURNING id', [chatId, userId]);
    await manager.getRepository(ConversationMember).update({ conversationId: chatId, userId }, { lastReadAt: new Date() });
    const query = manager.getRepository(Message).createQueryBuilder("m")
      .where('m."conversationId" = :chatId', { chatId })
      .addSelect(`to_char(m."createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`, "cursor_time")
      .orderBy('m."createdAt"', "DESC").addOrderBy("m.id", "DESC").take(limit + 1);
    if (cursor) query.andWhere('(m."createdAt", m.id) < (:date::timestamptz, :id::uuid)', cursor);
    const { entities: messages, raw } = await query.getRawAndEntities<{ cursor_time: string }>();
    const hasMore = messages.length > limit;
    messages.length = Math.min(messages.length, limit);
    const oldest = messages.at(-1);
    const cursorTime = raw[messages.length - 1]?.cursor_time;
    const user = await manager.getRepository(User).findOneByOrFail({ id: other.userId });
    return { updated, messages: messages.reverse(), user, nextCursor: hasMore && oldest
      ? Buffer.from(JSON.stringify({ date: cursorTime, id: oldest.id })).toString("base64url") : null };
  });
  if (result.updated.length) io.to(result.user.id).emit("messagesSeen", { chatId, seenBy: userId, messageIds: result.updated.map(message => message.id) });
  res.json({ messages: result.messages.map(publicMessage), user: publicUser(result.user), nextCursor: result.nextCursor });
});
