import { User } from '@/context/AppContext';
import { CornerDownRight, CornerUpLeft, LogOut, MessageCircle, Plus, Search, UserCircle, X } from 'lucide-react';
import React, { useState } from 'react'
import Link from 'next/link';

interface ChatSidebarProps{
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean)=> void;
    showAllUsers: boolean;
    setShowAllUsers:(show: boolean | ((prev:boolean)=>boolean))=>void;
    users: User[] |null;
    loggedInUser:  User |null;
    chats: any[] | null;
    selectedUser: string | null
    setSelectedUser:(userId:string | null)=> void;
    handleLogout: ()=>void;
    createChat: (user: User)=>void
} 

const ChatSidebar = ({
    sidebarOpen,
    setShowAllUsers,
    setSidebarOpen,
    showAllUsers,
    users,
    loggedInUser,
    chats,
    selectedUser,
    setSelectedUser,
    handleLogout,
    createChat,
   }:ChatSidebarProps) => {

    const [searchQuery, setSearchQuery] = useState("")
    
   return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-10 bg-black/50 sm:hidden backdrop-blur-sm"
        />
      )}

      
      <aside className={`fixed inset-y-0 left-0 z-20 w-80 bg-gray-900 border-r border-gray-700 transform transition-transform duration-300 ease-in-out flex flex-col h-screen
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
        sm:relative sm:translate-x-0`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-700 shrink-0">
            <div className="sm:hidden flex justify-end mb-4">
            <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            >
                <X className="w-5 h-5 text-gray-300" />
            </button>
            </div>

            <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-white">
                {showAllUsers ? "New Chat" : "Messages"}
                </h2>
            </div>

            <button
                className={`p-2.5 rounded-lg transition-colors ${
                showAllUsers
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
                onClick={() => setShowAllUsers((prev) => !prev)}
            >
                {showAllUsers ? (
                <X className="w-4 h-4" />
                ) : (
                <Plus className="w-4 h-4" />
                )}
            </button>
            </div>
        </div>

        
        <div className="flex-1 overflow-hidden px-4 py-2 flex flex-col min-h-0">
            {showAllUsers ? (
            <div className="space-y-4 h-full flex flex-col">
                <div className="relative shrink-0 mt-2">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search Users..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:border-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                </div>

                {/* Users List */}
                <div className="space-y-2 overflow-y-auto flex-1 pb-4 custom-scrollbar mt-2">
                {users
                    ?.filter(
                    (u) =>
                        u._id !== loggedInUser?._id &&
                        u.name
                        .toLowerCase()
                        .includes(searchQuery.toLocaleLowerCase())
                    )
                    .map((u) => (
                    <button
                        key={u._id}
                        className="w-full text-left p-4 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-800 transition-colors"
                        onClick={() => createChat(u)}
                    >
                        <div className="flex items-center gap-3">
                        <div className="relative">
                            <UserCircle className="w-6 h-6 text-gray-300" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <span className="font-medium text-white">{u.name}</span>
                        </div>
                        </div>
                    </button>
                    ))}
                </div>
            </div>
            ) : chats && chats.length > 0 ? (
            <div className="space-y-2 overflow-y-auto h-full pb-4 custom-scrollbar mt-2">
                {chats.map((chat) => {
                const latestMessage = chat.chat.latestMessage;
                const isSelected = selectedUser === chat.chat._id;
                const isSentByMe = latestMessage?.sender === loggedInUser?._id;
                const unseenCount = chat.chat.unseenCount || 0;

                return (
                    <button
                    key={chat.chat._id}
                    onClick={() => {
                        setSelectedUser(chat.chat._id);
                        setSidebarOpen(false);
                    }}
                    className={`w-full text-left p-4 rounded-lg transition-colors border ${
                        isSelected
                        ? "bg-blue-600 border-blue-500"
                        : "border-gray-700 hover:border-gray-600 hover:bg-gray-800/50"
                    }`}
                    >
                    <div className="flex items-center gap-3">
                        <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                            <UserCircle className="w-7 h-7 text-gray-300" />
                        </div>
                        </div>
                        <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                            <span
                            className={`font-semibold truncate ${
                                isSelected ? "text-white" : "text-gray-200"
                            }`}
                            >
                            {chat.user.name}
                            </span>
                            {unseenCount > 0 && (
                            <div className="bg-red-600 text-white text-xs font-bold rounded-full min-w-5 h-5 flex items-center justify-center px-1.5">
                                {unseenCount > 99 ? "99+" : unseenCount}
                            </div>
                            )}
                        </div>

                        {latestMessage && (
                            <div className="flex items-center gap-2">
                            {isSentByMe ? (
                                <CornerUpLeft
                                size={14}
                                className={isSelected ? "text-blue-200" : "text-blue-400"}
                                />
                            ) : (
                                <CornerDownRight
                                size={14}
                                className={isSelected ? "text-green-200" : "text-green-400"}
                                />
                            )}
                            <span className={`text-sm truncate flex-1 ${isSelected ? "text-blue-100" : "text-gray-400"}`}>
                                {latestMessage.text}
                            </span>
                            </div>
                        )}
                        </div>
                    </div>
                    </button>
                );
                })}
            </div>
            ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="p-4 bg-gray-800 rounded-full mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-400 font-medium">No conversation yet</p>
                <p className="text-sm text-gray-500 mt-1">
                Start a new chat to begin messaging
                </p>
            </div>
            )}
        </div>

        {/* Footer */}
        {/* FIX: 'mt-auto' forces this section to the absolute bottom */}
        <div className="p-4 border-t border-gray-700 space-y-2 bg-gray-900 mt-auto shrink-0">
            <Link
            href={"/profile"}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors group"
            >
            <div className="p-1.5 bg-gray-700 rounded-lg group-hover:bg-gray-600">
                <UserCircle className="w-4 h-4 text-gray-300" />
            </div>
            <span className="font-medium text-gray-300 group-hover:text-white">Profile</span>
            </Link>

            <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-600/10 transition-colors text-red-500 hover:text-red-400 group"
            >
            <div className="p-1.5 bg-red-500/10 rounded-lg group-hover:bg-red-500/20">
                {/* FIX: Made icon red to match target design */}
                <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="font-medium">Logout</span>
            </button>
        </div>
    </aside>
    </>
  )
}

export default ChatSidebar