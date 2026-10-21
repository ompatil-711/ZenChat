import { Server } from "socket.io";
import http from "node:http";
import express from "express";
import { AppDataSource, ConversationMember, authenticateToken, isUuid } from "@zenchat/database";
export const app = express();
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: { origin: (process.env.FRONTEND_URL || "http://localhost:3000").split(",") },
});
io.use(async (socket, next) => {
  try {
    if (typeof socket.handshake.auth.token !== "string") throw new Error("Missing session");
    socket.data.user = await authenticateToken(socket.handshake.auth.token);
    next();
  } catch { next(new Error("Please log in again.")); }
});
const onlineUsers = () => [...new Set([...io.sockets.sockets.values()].map(s => s.data.user._id as string))];
const broadcastPresence = () => io.emit("getOnlineUser", onlineUsers());
export function isUserInChat(userId: string, chatId: string) {
  const sockets = io.sockets.adapter.rooms.get(userId);
  return !!sockets && [...sockets].some(id => io.sockets.sockets.get(id)?.rooms.has(chatId));
}
io.on("connection", socket => {
  const userId: string = socket.data.user._id;
  void socket.join(userId);
  broadcastPresence();
  socket.on("joinChat", async (chatId: unknown, ack?: (result: { ok: boolean }) => void) => {
    try {
      if (!isUuid(chatId)) { if (typeof ack === "function") ack({ ok: false }); return; }
      const member = await AppDataSource.getRepository(ConversationMember).existsBy({ conversationId: chatId, userId });
      if (!member) { if (typeof ack === "function") ack({ ok: false }); return; }
      await socket.join(chatId);
      if (typeof ack === "function") ack({ ok: true });
    } catch { if (typeof ack === "function") ack({ ok: false }); }
  });
  socket.on("leaveChat", (chatId: unknown) => {
    if (!isUuid(chatId) || chatId === userId) return;
    socket.to(chatId).emit("userStoppedTyping", { chatId, userId });
    void socket.leave(chatId);
  });
  let lastTyping = 0;
  socket.on("typing", (data: { chatId?: unknown } | null) => {
    if (!isUuid(data?.chatId) || !socket.rooms.has(data.chatId)) return;
    if (Date.now() - lastTyping < 500) return;
    lastTyping = Date.now();
    socket.to(data.chatId).emit("userTyping", { chatId: data.chatId, userId });
  });
  socket.on("stopTyping", (data: { chatId?: unknown } | null) => {
    if (!isUuid(data?.chatId) || !socket.rooms.has(data.chatId)) return;
    socket.to(data.chatId).emit("userStoppedTyping", { chatId: data.chatId, userId });
  });
  socket.on("disconnect", broadcastPresence);
});
