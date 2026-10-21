export interface User { _id: string; name: string; email: string }
export interface Chat {
  _id: string; users: string[]; latestMessage: { text: string; sender: string } | null;
  createdAt: string; updatedAt: string; unseenCount: number;
}
export interface Chats { _id: string; user: User; chat: Chat }
export interface Message {
  _id: string; chatId: string; sender: string; text: string;
  image?: { url: string; publicId: string | null };
  messageType: "text" | "image"; seen: boolean; seenAt: string | null; createdAt: string;
}
export interface MessagePage { messages: Message[]; user: User; nextCursor: string | null }
export interface SeenEvent { chatId: string; seenBy: string; messageIds: string[] }

