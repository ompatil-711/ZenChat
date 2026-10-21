"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import Loading from "@/components/Loading";
import ChatSidebar from "@/components/ChatSidebar";
import ChatHeader from "@/components/ChatHeader";
import ChatMessages from "@/components/ChatMessages";
import MessageInput from "@/components/MessageInput";
import { useAppData } from "@/context/AppContext";
import { SocketData } from "@/context/SocketContext";
import api, { chat_service, errorMessage } from "@/lib/api";
import type { Message, MessagePage, SeenEvent, User } from "@/types/chat";
export type { Message } from "@/types/chat";
interface History extends MessagePage { chatId: string }
function mergeMessages(old: Message[], incoming: Message[]) {
  const all = new Map(old.map(message => [message._id, message]));
  incoming.forEach(message => all.set(message._id, message));
  return [...all.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a._id.localeCompare(b._id));
}
export default function ZenChat() {
  const { loading, isAuth, logoutUser, chats, users, user: loggedInUser, fetchChats } = useAppData();
  const { socket } = SocketData();
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [history, setHistory] = useState<History | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = history?.chatId === selectedUser ? history : null;
  const headers = () => ({ Authorization: "Bearer " + Cookies.get("token") });

  useEffect(() => { if (!loading && !isAuth) router.replace("/login"); }, [isAuth, loading, router]);
  const fetchCurrent = useCallback(async (chatId: string, signal?: AbortSignal) => {
    const { data } = await api.get<MessagePage>(chat_service + "/api/v1/chat/message/" + chatId, { headers: headers(), signal });
    if (signal?.aborted) return;
    setHistory(prev => ({ ...data, chatId,
      nextCursor: prev?.chatId === chatId ? prev.nextCursor : data.nextCursor,
      messages: prev?.chatId === chatId ? mergeMessages(prev.messages, data.messages) : data.messages }));
    setHistoryError("");
    await fetchChats();
  }, [fetchChats]);
  useEffect(() => {
    if (!selectedUser) return;
    const controller = new AbortController();
    socket?.emit("joinChat", selectedUser);
    void fetchCurrent(selectedUser, controller.signal).catch(error => {
      if (!controller.signal.aborted) setHistoryError(errorMessage(error));
    });
    return () => {
      controller.abort();
      if (typingTimer.current) clearTimeout(typingTimer.current);
      socket?.emit("stopTyping", { chatId: selectedUser });
      socket?.emit("leaveChat", selectedUser);
    };
  }, [selectedUser, socket, fetchCurrent]);
  useEffect(() => {
    if (!socket) return;
    const onMessage = (incoming: Message) => {
      if (incoming.chatId === selectedUser) {
        setHistory(prev => prev?.chatId === selectedUser ? { ...prev, messages: mergeMessages(prev.messages, [incoming]) } : prev);
        if (incoming.sender !== loggedInUser?._id) void fetchCurrent(incoming.chatId).catch(error => toast.error(errorMessage(error)));
      }
      void fetchChats().catch(error => toast.error(errorMessage(error)));
    };
    const onSeen = (event: SeenEvent) => setHistory(prev => prev?.chatId === event.chatId ? {
      ...prev, messages: prev.messages.map(message => event.messageIds.includes(message._id)
        ? { ...message, seen: true, seenAt: new Date().toISOString() } : message),
    } : prev);
    const onChat = () => { void fetchChats().catch(error => toast.error(errorMessage(error))); };
    socket.on("newMessage", onMessage); socket.on("messagesSeen", onSeen); socket.on("chatCreated", onChat);
    return () => { socket.off("newMessage", onMessage); socket.off("messagesSeen", onSeen); socket.off("chatCreated", onChat); };
  }, [socket, selectedUser, loggedInUser?._id, fetchCurrent, fetchChats]);
  async function createChat(user: User) {
    try {
      const { data } = await api.post<{ chatId: string }>(chat_service + "/api/v1/chat/new", { otherUserId: user._id }, { headers: headers() });
      setSelectedUser(data.chatId); setShowAllUsers(false);
      await fetchChats();
    } catch (error) { toast.error(errorMessage(error)); }
  }
  function handleTyping(value: string) {
    setMessage(value);
    if (!selectedUser || !socket) return;
    socket.emit("typing", { chatId: selectedUser });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("stopTyping", { chatId: selectedUser }), 2000);
  }
  async function sendMessage(_event: FormEvent<HTMLFormElement>, image?: File | null): Promise<boolean> {
    if (!selectedUser) return false;
    const chatId = selectedUser;
    try {
      socket?.emit("stopTyping", { chatId });
      if (typingTimer.current) clearTimeout(typingTimer.current);
      const body = new FormData();
      body.append("chatId", chatId);
      if (message.trim()) body.append("text", message.trim());
      if (image) body.append("image", image);
      const { data } = await api.post<{ message: Message }>(chat_service + "/api/v1/chat/message", body, { headers: headers(), timeout: 30000 });
      setHistory(prev => prev?.chatId === chatId ? { ...prev, messages: mergeMessages(prev.messages, [data.message]) } : prev);
      setMessage("");
      await fetchChats();
      return true;
    } catch (error) { toast.error(errorMessage(error)); return false; }
  }
  async function loadOlder() {
    if (!current?.nextCursor || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const { data } = await api.get<MessagePage>(chat_service + "/api/v1/chat/message/" + current.chatId, {
        params: { before: current.nextCursor }, headers: headers(),
      });
      setHistory(prev => prev?.chatId === current.chatId ? { ...prev, nextCursor: data.nextCursor, messages: mergeMessages(data.messages, prev.messages) } : prev);
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setLoadingOlder(false); }
  }
  if (loading) return <Loading />;
  if (!isAuth) return null;
  return <div className="min-h-screen flex bg-gray-900 text-white relative overflow-hidden">
    <ChatSidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} showAllUsers={showAllUsers} setShowAllUsers={setShowAllUsers}
      users={users} loggedInUser={loggedInUser} chats={chats} selectedUser={selectedUser} setSelectedUser={setSelectedUser}
      handleLogout={() => void logoutUser()} createChat={createChat} />
    <div className="flex-1 min-w-0 flex flex-col justify-between p-4 bg-white/5 border border-white/10">
      <ChatHeader user={current?.user || null} chatId={selectedUser} setSidebarOpen={setSidebarOpen} />
      {historyError ? <p role="alert" className="text-red-300">{historyError}</p> : null}
      {current?.nextCursor ? <button type="button" disabled={loadingOlder} onClick={() => void loadOlder()} className="text-blue-300 py-2">
        {loadingOlder ? "Loading…" : "Load older messages"}
      </button> : null}
      <ChatMessages selectedUser={selectedUser} messages={current?.messages || null} loggedInUser={loggedInUser} />
      <MessageInput selectedUser={selectedUser} message={message} setMessage={handleTyping} handleMessageSend={sendMessage} />
    </div>
  </div>;
}
