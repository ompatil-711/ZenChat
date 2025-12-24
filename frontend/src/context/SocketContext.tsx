"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import io from "socket.io-client";
import { chat_service, useAppData } from "./AppContext";

interface SocketContextType {
  // 👇 UPDATED: Use 'any' to avoid type errors
  socket: any | null;
  onlineUsers: string[];
  // 👇 NEW: State to store who is currently typing
  typingUsers: string[]; 
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
  // 👇 NEW: Initialize empty
  typingUsers: [], 
});

interface ProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: ProviderProps) => {
  const [socket, setSocket] = useState<any | null>(null);
  const { user } = useAppData();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  // 👇 NEW: Local state for typing users
  const [typingUsers, setTypingUsers] = useState<string[]>([]); 

  useEffect(() => {
    if (!user?._id) return;

    const newSocket = io(chat_service, {
      query: {
        userId: user._id,
      },
      transports: ["websocket"],
    });

    setSocket(newSocket);

    newSocket.on("getOnlineUser", (users: string[]) => {
      setOnlineUsers(users);
    });

    // 👇 NEW: Listen for 'userTyping' event from backend
    newSocket.on("userTyping", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => {
        if (!prev.includes(userId)) return [...prev, userId];
        return prev;
      });
    });

    // 👇 NEW: Listen for 'userStoppedTyping' event from backend
    newSocket.on("userStoppedTyping", ({ userId }: { userId: string }) => {
      setTypingUsers((prev) => prev.filter((id) => id !== userId));
    });

    return () => {
      newSocket.close();
    };
  }, [user?._id]);

  return (
    // 👇 UPDATED: Pass 'typingUsers' to the provider
    <SocketContext.Provider value={{ socket, onlineUsers, typingUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const SocketData = () => useContext(SocketContext);