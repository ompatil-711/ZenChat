import { Message } from "@/app/chat/page";
import { User } from "@/context/AppContext";
import React, { useEffect, useMemo, useRef } from "react";
import moment from "moment";
import { Check, CheckCheck } from "lucide-react";

interface ChatMessagesProps {
  selectedUser: string | null;
  messages: Message[] | null;
  loggedInUser: User | null;
}

const ChatMessages = ({
  selectedUser,
  messages,
  loggedInUser,
}: ChatMessagesProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  const uniqueMessages = useMemo(() => {
    if (!messages) return [];
    const seen = new Set();
    return messages.filter((message) => {
      if (seen.has(message._id)) {
        return false;
      }
      seen.add(message._id);
      return true;
    });
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedUser, uniqueMessages]);

  return (
    <div className="flex-1 overflow-hidden">
      <div className="h-full max-h-[calc(100vh-215px)] overflow-y-auto p-2 space-y-2 custom-scroll">
        {!selectedUser ? (
          <p className="text-gray-400 text-center mt-20">
            Please select a user to start chatting 📩
          </p>
        ) : (
          <>
            {uniqueMessages.map((e, i) => {
              const isSentByMe = e.sender === loggedInUser?._id;
              const uniqueKey = `${e._id}-${i}`;

              // We cast to any to safely inspect all fields
              const msgData = e as any;
              
              // Try to find the image for rendering (best guess)
              const imageUrl = msgData.image 
                ? (typeof msgData.image === 'string' ? msgData.image : msgData.image.url) 
                : (msgData.imageUrl || msgData.fileUrl || null);

              return (
                <div
                  className={`flex flex-col gap-1 mt-2 ${
                    isSentByMe ? "items-end" : "items-start"
                  }`}
                  key={uniqueKey}
                >
                  <div
                    className={`rounded-lg p-3 max-w-sm ${
                      isSentByMe
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-white"
                    }`}
                  >
                    {/* --- DEBUG MODE: PRINT RAW DATA --- */}
                    {e.messageType === "image" && !imageUrl && (
                      <div className="text-[10px] font-mono bg-black/50 p-2 rounded mb-2 break-all text-yellow-300">
                         <strong>Raw Backend Data:</strong>
                         <pre className="whitespace-pre-wrap">
                           {JSON.stringify(e, null, 2)}
                         </pre>
                      </div>
                    )}
                    
                    {/* Render Image if found */}
                    {e.messageType === "image" && imageUrl && (
                        <div className="relative group mb-1">
                          <img
                            src={imageUrl}
                            alt="shared"
                            className="max-w-full h-auto rounded-lg"
                          />
                        </div>
                    )}

                    {e.text && <p className="mt-1">{e.text}</p>}
                  </div>

                  {/* Footer (Time/Seen) */}
                  <div
                    className={`flex items-center gap-1 text-xs text-gray-400 ${
                      isSentByMe ? "pr-2 flex-row-reverse" : "pl-2"
                    }`}
                  >
                    <span>
                      {moment(e.createdAt).format("hh:mm A . MMM D")}
                    </span>
                    {isSentByMe && (
                      <div className="flex items-center ml-1">
                        {e.seen ? (
                          <div className="flex items-center gap-1 text-blue-400">
                            <CheckCheck className="w-3 h-3" />
                          </div>
                        ) : (
                          <Check className="w-3 h-3 text-gray-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>
    </div>
  );
};

export default ChatMessages;