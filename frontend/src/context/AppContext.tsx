"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode, Dispatch, SetStateAction } from "react";
import Cookies from "js-cookie";
import api, { user_service, chat_service, errorMessage } from "@/lib/api";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import type { User, Chats } from "@/types/chat";
export type { User, Chat, Chats } from "@/types/chat";
export { user_service, chat_service } from "@/lib/api";
interface AppContextType {
  user: User | null; loading: boolean; isAuth: boolean; users: User[] | null; chats: Chats[] | null;
  setUser: Dispatch<SetStateAction<User | null>>; setIsAuth: Dispatch<SetStateAction<boolean>>;
  setChats: Dispatch<SetStateAction<Chats[] | null>>;
  logoutUser: () => Promise<void>; fetchUsers: () => Promise<void>; fetchChats: () => Promise<void>;
}
const AppContext = createContext<AppContextType | undefined>(undefined);
export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);
  const [users, setUsers] = useState<User[] | null>(null);
  const [chats, setChats] = useState<Chats[] | null>(null);
  const fetchChats = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    const { data } = await api.get<{ chats: Chats[] }>(chat_service + "/api/v1/chat/all", { headers: { Authorization: "Bearer " + token } });
    setChats(data.chats);
  }, []);
  const fetchUsers = useCallback(async () => {
    const token = Cookies.get("token");
    if (!token) return;
    const { data } = await api.get<User[]>(user_service + "/api/v1/user/all", { headers: { Authorization: "Bearer " + token } });
    setUsers(data);
  }, []);
  const logoutUser = useCallback(async () => {
    Cookies.remove("token");
    setUser(null); setIsAuth(false); setUsers(null); setChats(null);
    toast.success("Logged out");
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      const token = Cookies.get("token");
      try {
        if (!token) return;
        const { data } = await api.get<User>(user_service + "/api/v1/user/me", {
          signal: controller.signal, headers: { Authorization: "Bearer " + token },
        });
        if (!controller.signal.aborted) { setUser(data); setIsAuth(true); }
      } catch (error) {
        if (controller.signal.aborted) return;
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401) Cookies.remove("token");
        else toast.error(errorMessage(error));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void loadSession();
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!isAuth) return;
    void Promise.all([fetchUsers(), fetchChats()]).catch(error => toast.error(errorMessage(error)));
  }, [isAuth, fetchUsers, fetchChats]);
  return <AppContext.Provider value={{ user, loading, isAuth, users, chats, setUser, setIsAuth, setChats, logoutUser, fetchUsers, fetchChats }}>
    {children}<Toaster />
  </AppContext.Provider>;
}
export function useAppData() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppData must be used within AppProvider");
  return context;
}
