import { User } from '@/context/AppContext';
import React from 'react'

interface ChatSidebarProps{
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean)=> void;
    showAllUsers: boolean;
    setShowAllUser:(show: boolean | ((prev:boolean)=>boolean))=>void;
    users: User[] |null;
    loggedInUser:  User |null;
    chats: any[] | null;
    selectedUser: string | null
    setselectedUser:(userId:string | null)=> void;
    handleLogout: ()=>void;
} 
const ChatSidebar = ({sidebarOpen,setShowAllUser,setSidebarOpen,showAllUsers,users,loggedInUser,chats,selectedUser,setselectedUser}:ChatSidebarProps) => {
  return (
    <div>
      ChatSidebar

    </div>
  )
}

export default ChatSidebar
