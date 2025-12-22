"use client"

import Loading from '@/components/Loading'
import ChatSidebar from '@/components/ChatSidebar'
import { chat_service, useAppData, User } from '@/context/AppContext'
import { useRouter } from 'next/navigation'; 
import React, { useEffect , useState} from 'react'
import { SidebarOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import Cookies from 'js-cookie';
import axios from 'axios';

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
    setChats,
  } = useAppData();

  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [siderbarOpen, setSiderbarOpen] = useState(false);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [showAllUser, setShowAllUser] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeOut, setTypingTimeOut] = useState<NodeJS.Timeout | null>(null)

  const router = useRouter()

  useEffect(()=>{
    if(!isAuth && !loading){
      router.push("/login")
    }
  },[isAuth,router,loading])


  const handleLogout = ()=>{
    logoutUser()
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
      toast.error("Failed to start chat")
    }
  }

  if(loading) return <Loading/>
  if(!isAuth) return null
  return (
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
        />
        <div className="flex-1 flex flex-col justify-between p-4 backdrop-blur-x1 bg-white/5 border-white/10"></div>
    </div >
  )
}

export default ZenChat
