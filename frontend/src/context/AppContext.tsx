"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Cookies from 'js-cookie';
import axios from "axios";
import { Toaster } from 'react-hot-toast'
import toast from "react-hot-toast/headless";

export const user_service = "http://localhost:5000"
export const chat_service = "http://localhost:5002"

export interface User{
    _id: string;
    name: string;
    email: string;
}

export interface Chat{
    _id: string;
    users: string[];
    latestMessage:{
        text: string,
        sender: string;
    };
    createdAt: string;
    updatedAt: string;
    unseesCount?: number;
}

export interface Chats{
    _id: string;
    user: User;
    chat: Chat;
}

interface AppContextType{
    user: User | null;
    loading: boolean;
    isAuth: boolean;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    setIsAuth: React.Dispatch<React.SetStateAction<boolean>>;
    logoutUser: ()=> Promise<void>
    fetchUsers: ()=> Promise<void>
    fetchChats: ()=> Promise<void>
    chats: Chats[] | null;
    users: User[] | null;
    setChats: React.Dispatch<React.SetStateAction<Chats[] | null>>;
    onlineUsers: string[];
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps{
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({children})=>{
    const [user,setUser] = useState<User | null>(null)
    const [isAuth, setIsAuth] = useState(false)
    const [loading, setLoading] =useState(true)

    // 1. FIXED: This fetches YOUR profile. URL must be /me
    
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);

    async function fetchUser(){
        try {
            const token = Cookies.get("token")

            if (!token) {
                setLoading(false);
                return;
            }

            // 👇 CORRECTED: Changed '/api/v1/user/all' to '/api/v1/user/me'
            const {data} = await axios.get(`${user_service}/api/v1/user/me`,{
                headers:{
                    Authorization: `Bearer ${token}`,
                }
            })

            setUser(data)
            setIsAuth(true);
        } catch (error) {
            console.log(error);
            setIsAuth(false);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }
    
    async function logoutUser(){
        Cookies.remove("token")
        setUser(null);
        setIsAuth(false)
        toast.success("User Logged Out")
    }

    const [chats, setChats] = useState<Chats[] | null>(null)
    
    // 2. FIXED: This fetches chat list. URL must be /all
    async function fetchChats() {
        const token = Cookies.get("token")
        try {
            // 👇 CORRECTED: Changed '/api/v1/chat/me' to '/api/v1/chat/all'
            const {data} = await axios.get(`${chat_service}/api/v1/chat/all`,{
                headers:{
                    Authorization: `Bearer ${token}`,
                },
            });

            setChats(data.chats);
        } catch (error) {
            console.log(error);
        }
    }

    const[users,setUsers] = useState<User[]|null>(null)

    // 3. This one was actually correct (fetches the sidebar list)
    async function fetchUsers(){
        const token = Cookies.get("token")
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const {data} = await axios.get(`${user_service}/api/v1/user/all`,{
                headers:{
                    Authorization: `Bearer ${token}`
                }
            })

            setUsers(data)
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(()=>{
        fetchUser();
        fetchChats();
        fetchUsers();
    },[])

    return (
        <AppContext.Provider  value={{user,setUser, isAuth, setIsAuth,loading,logoutUser,fetchChats,fetchUsers,users,chats,setChats,onlineUsers}}>{children}<Toaster/></AppContext.Provider>
    )
}

export const useAppData = () : AppContextType =>{
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within AppProvider");
    }
    return context;
}