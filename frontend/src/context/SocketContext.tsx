"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
// FIX: Import only the default 'io' function.
// We removed 'Socket' from imports to stop the Type/Value conflict.
import io from "socket.io-client";
import { chat_service, useAppData } from "./AppContext";

interface SocketContextType {
  // FIX: Use 'any' type here. This works 100% and bypasses the error.
  socket: any | null;
  onlineUsers: string[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  onlineUsers: [],
});

interface ProviderProps {
  children: ReactNode;
}

export const SocketProvider = ({ children }: ProviderProps) => {
  // FIX: Use 'any' here as well
  const [socket, setSocket] = useState<any | null>(null);
  const { user } = useAppData();
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

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

    return () => {
      newSocket.close();
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
};

export const SocketData = () => useContext(SocketContext);