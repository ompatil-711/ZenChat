"use client";

import Loading from "@/components/Loading";
import ChatSidebar from "@/components/ChatSidebar";
import ChatHeader from "@/components/ChatHeader";
import { chat_service, useAppData, User } from "@/context/AppContext";
import { SocketData } from "@/context/SocketContext";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import axios from "axios";
import ChatMessages from "@/components/ChatMessages";
import MessageInput from "@/components/MessageInput";

export interface Message {
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?: {
    url: string;
    public: string;
  };
  messageType: "text" | "image";
  seen: boolean;
  seenAt?: string;
  createdAt: string;
}

const ZenChat = () => {
  const {
    loading,
    isAuth,
    logoutUser,
    chats,
    user: loggedInUser,
    users,
    fetchChats,
    setChats,
  } = useAppData();

  const { socket } = SocketData();
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [siderbarOpen, setSiderbarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAllUser, setShowAllUser] = useState(false);

  const router = useRouter();

  // 1. Auth Check
  useEffect(() => {
    if (!isAuth && !loading) {
      router.push("/login");
    }
  }, [isAuth, router, loading]);

  const handleLogout = () => {
    logoutUser();
  };

  // 2. Fetch Messages
  async function fetchChat() {
    const token = Cookies.get("token");
    try {
      const { data } = await axios.get(
        `${chat_service}/api/v1/chat/message/${selectedUser}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setMessages(data.messages);
      setUser(data.user);
    } catch (error) {
      console.log(error);
      toast.error("Failed to load messages");
    }
  }

  // 3. Helper: Reset Unseen Count (RESTORED from ChatApp)
  const resetUnseenCount = (chatId: string) => {
    setChats((prev) => {
      if (!prev) return null;
      return prev.map((chat) => {
        if (chat.chat._id === chatId) {
          return {
            ...chat,
            chat: {
              ...chat.chat,
              unseenCount: 0,
            },
          };
        }
        return chat;
      });
    });
  };

  // 4. Helper: Move Chat To Top (RESTORED)
  const moveChatToTop = (
    chatId: string,
    newMessage: any,
    updatedUnseenCount = true
  ) => {
    setChats((prev: any) => {
      if (!prev) return null;

      const updatedChats = [...prev];
      const chatIndex = updatedChats.findIndex(
        (chat: any) => chat.chat._id === chatId
      );

      if (chatIndex !== -1) {
        const [moveChat] = updatedChats.splice(chatIndex, 1);

        const updatedChat = {
          ...moveChat,
          chat: {
            ...moveChat.chat,
            latestMessage: {
              text: newMessage.text,
              sender: newMessage.sender,
            },
            updatedAt: new Date().toString(),
            unseenCount:
              updatedUnseenCount && newMessage.sender !== loggedInUser?._id
                ? (moveChat.chat.unseenCount || 0) + 1
                : moveChat.chat.unseenCount || 0,
          },
        };

        updatedChats.unshift(updatedChat);
      }
      return updatedChats;
    });
  };

  // 5. Create New Chat
  async function createChat(u: User) {
    try {
      const token = Cookies.get("token");
      const { data } = await axios.post(
        `${chat_service}/api/v1/chat/new`,
        {
          userId: loggedInUser?._id,
          otherUserId: u._id,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSelectedUser(data.chatId);
      setShowAllUser(false);
      await fetchChats();
    } catch (error) {
      console.log(error);
      toast.error("Failed to start chat");
    }
  }

  // 6. Socket Emission: Handle Typing
  const handleTyping = (value: string) => {
    setMessage(value);

    if (!selectedUser || !socket) return;

    socket.emit("typing", {
      chatId: selectedUser,
      userId: loggedInUser?._id,
    });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        chatId: selectedUser,
        userId: loggedInUser?._id,
      });
    }, 2000);
  };

  // 7. API + Socket Emission: Send Message
  const handleMessageSend = async (e: any, imageFile?: File | null) => {
    if (!selectedUser) return;

    try {
      if (socket) {
        socket.emit("stopTyping", {
          chatId: selectedUser,
          userId: loggedInUser?._id,
        });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      }

      const token = Cookies.get("token");
      const formData = new FormData();

      formData.append("chatId", selectedUser);
      if (message.trim()) formData.append("text", message);
      if (imageFile) formData.append("image", imageFile);

      const res = await axios.post(
        `${chat_service}/api/v1/chat/message`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // Update UI instantly
      moveChatToTop(selectedUser, res.data.message, false);

      setMessage("");
      await fetchChat();
    } catch (error) {
      console.log(error);
      toast.error("Failed to send message");
    }
  };

  // 8. Socket LISTENERS (MISSING PART RESTORED)
  useEffect(() => {
    // Listener: New Message
    socket?.on("newMessage", (message: any) => {
      console.log("Received new message:", message);

      if (selectedUser === message.chatId) {
        // If we are looking at this chat, append message
        setMessages((prev) => {
          const currentMessages = prev || [];
          const messageExists = currentMessages.some(
            (msg) => msg._id === message._id
          );
          if (!messageExists) {
            return [...currentMessages, message];
          }
          return currentMessages;
        });
        // Update sidebar without increasing unseen count
        moveChatToTop(message.chatId, message, false);
      } else {
        // If we are NOT looking at this chat, update sidebar AND increase unseen count
        moveChatToTop(message.chatId, message, true);
      }
    });

    // Listener: Messages Seen
    socket?.on("messagesSeen", (data: any) => {
      console.log("Message seen by:", data);
      if (selectedUser === data.chatId) {
        setMessages((prev) => {
          if (!prev) return null;
          return prev.map((msg) => {
            if (
              msg.sender === loggedInUser?._id &&
              data.messageIds &&
              data.messageIds.includes(msg._id)
            ) {
              return {
                ...msg,
                seen: true,
                seenAt: new Date().toString(),
              };
            }
            return msg;
          });
        });
      }
    });

    // Note: 'userTyping' listeners are NOT needed here because 
    // ChatHeader handles them via SocketContext now.

    return () => {
      socket?.off("newMessage");
      socket?.off("messagesSeen");
    };
  }, [socket, selectedUser, loggedInUser?._id, setChats]); // Dependencies

  // 9. Join Room & Cleanup
  useEffect(() => {
    if (selectedUser) {
      fetchChat();
      resetUnseenCount(selectedUser); // Reset counts when entering chat
      
      socket?.emit("joinChat", selectedUser);

      return () => {
        socket?.emit("leaveChat", selectedUser);
        setMessages(null);
      };
    }
  }, [selectedUser, socket]);

  if (loading) return <Loading />;
  if (!isAuth) return null;

  return (
    <div className="min-h-screen flex bg-gray-900 text-white relative overflow-hidden">
      <ChatSidebar
        sidebarOpen={siderbarOpen}
        setSidebarOpen={setSiderbarOpen}
        showAllUsers={showAllUser}
        setShowAllUsers={setShowAllUser}
        users={users}
        loggedInUser={loggedInUser}
        chats={chats}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        handleLogout={handleLogout}
        createChat={createChat}
      />

      <div className="flex-1 flex flex-col justify-between p-4 backdrop-blur-xl bg-white/5 border border-white/10">
        <ChatHeader user={user} setSidebarOpen={setSiderbarOpen} />

        <ChatMessages
          selectedUser={selectedUser}
          messages={messages}
          loggedInUser={loggedInUser}
        />

        <MessageInput
          selectedUser={selectedUser}
          message={message}
          setMessage={handleTyping}
          handleMessageSend={handleMessageSend}
        />
      </div>
    </div>
  );
};

export default ZenChat;