"use client"

import Loading from '@/components/Loading'
import ChatSidebar from '@/components/ChatSidebar'
import ChatHeader from '@/components/ChatHeader'
import { chat_service, useAppData, User } from '@/context/AppContext'
import { useRouter } from 'next/navigation'; 
import React, { useEffect , useState} from 'react'
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import axios from 'axios';
import ChatMessages from '@/components/ChatMessages'
import MessageInput from '@/components/MessageInput'

// ... (Your interface Message definition stays the same) ...
export interface Message{
  _id: string;
  chatId: string;
  sender: string;
  text?: string;
  image?:{
    url: string;
    public: string;
  };
  messageType:"text"| "image";
  seen:boolean;
  seenAt?: string;
  createdAt: string
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
    onlineUsers, // Make sure to get this from context!
  } = useAppData();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [siderbarOpen, setSiderbarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAllUser, setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const router = useRouter()

  useEffect(()=>{
    if(!isAuth && !loading){
      router.push("/login")
    }
  },[isAuth,router,loading])

  const handleLogout = ()=>{
    logoutUser()
  }

  async function fetchChat() {
    const token = Cookies.get("token");
    try {
      const {data} = await axios.get(
        `${chat_service}/api/v1/chat/message/${selectedUser}`,
        {
          headers:{
            Authorization: `Bearer ${token}` 
          }
        }
      );
      setMessages(data.messages)
      setUser(data.user)
    } catch (error) {
      console.log(error);
      toast.error("Failed to load messages")
    }
  }

  async function createChat(u: User){
    try {
      const token = Cookies.get("token")
      const {data} = await axios.post(`${chat_service}/api/v1/chat/new`,{
        userId: loggedInUser?._id,
        otherUserId: u._id,
      },{
        headers:{
          Authorization:`Bearer ${token}`,
        },
      });
      setSelectedUser(data.chatId)
      setShowAllUser(false)
      await fetchChats()
    } catch (error) {
      console.log(error)
      toast.error("Failed to start chat")
    }
  }

  // 👇 ADDED: Handle Typing Logic
  const handleTyping = (value: string) => {
     setMessage(value);
     // If you implement socket.io later, you will emit the "typing" event here
  }

  // 👇 ADDED: Handle Message Send Logic (Text + Image)
  const handleMessageSend = async (e: any, imageFile?: File | null) => {
    if (!selectedUser) return;

    try {
      const token = Cookies.get("token");
      const formData = new FormData();
      
      formData.append("chatId", selectedUser);
      if (message.trim()) formData.append("text", message);
      if (imageFile) formData.append("image", imageFile);

      // Call the "Send Message" API
      await axios.post(`${chat_service}/api/v1/chat/message`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Clear input and refresh chat
      setMessage("");
      await fetchChat(); // Refresh messages to see the new one
      await fetchChats(); // Refresh sidebar to update "latest message"
    } catch (error) {
      console.log(error);
      toast.error("Failed to send message");
    }
  };

  useEffect(()=>{
    if(selectedUser){
      fetchChat()
    }
  }, [selectedUser]) 

  
  if(loading) return <Loading/>
  if(!isAuth) return null

  return (
    // FIX 1: Main Container must be 'flex' and 'relative' only. 
    // Do NOT add 'justify-between' here.
    <div className='min-h-screen flex bg-gray-900 text-white relative overflow-hidden'>
        
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
          //onlineUsers={onlineUsers}
        />

        <div className="flex-1 flex flex-col justify-between p-4 backdrop-blur-xl bg-white/5 border border-white/10">
        <ChatHeader
          user={user}
          setSidebarOpen={setSiderbarOpen}
          isTyping={isTyping}
          onlineUsers={onlineUsers}
        />

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

export default ZenChat