"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import Cookies from "js-cookie";
import { chat_service, useAppData } from "./AppContext";
interface TypingEvent { chatId: string; userId: string }
interface SocketContextType {
  socket: Socket | null; onlineUsers: string[]; typingByChat: Record<string, string[]>;
}
const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: [], typingByChat: {} });
export const SocketData = () => useContext(SocketContext);
export function SocketProvider({ children }: { children: ReactNode }) {
  const { user } = useAppData();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingByChat, setTyping] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!user?._id) return;
    const connection = io(chat_service, {
      auth: cb => cb({ token: Cookies.get("token") }), transports: ["websocket"],
    });
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    function stop({ chatId, userId }: TypingEvent) {
      const key = chatId + ":" + userId;
      clearTimeout(timers.get(key)); timers.delete(key);
      setTyping(prev => ({ ...prev, [chatId]: (prev[chatId] || []).filter(id => id !== userId) }));
    }
    connection.on("connect", () => { setSocket(connection); setTyping({}); });
    connection.on("disconnect", () => { setSocket(null); setOnlineUsers([]); setTyping({}); });
    connection.on("getOnlineUser", (users: string[]) => setOnlineUsers(users));
    connection.on("userTyping", (data: TypingEvent) => {
      const key = data.chatId + ":" + data.userId;
      clearTimeout(timers.get(key));
      setTyping(prev => ({ ...prev, [data.chatId]: [...new Set([...(prev[data.chatId] || []), data.userId])] }));
      timers.set(key, setTimeout(() => stop(data), 5000));
    });
    connection.on("userStoppedTyping", stop);
    return () => {
      timers.forEach(clearTimeout);
      connection.disconnect();
      connection.removeAllListeners();
    };
  }, [user?._id]);
  return <SocketContext.Provider value={{ socket: user ? socket : null, onlineUsers: user ? onlineUsers : [], typingByChat: user ? typingByChat : {} }}>
    {children}
  </SocketContext.Provider>;
}
