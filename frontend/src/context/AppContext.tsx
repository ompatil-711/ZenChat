"use client"

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import Cookies from 'js-cookie';
import axios from "axios";
import { Toaster } from 'react-hot-toast'
// FIX 1: Remove "/headless" to make UI visible
import toast from "react-hot-toast"; 

const DEPLOYED_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

export const user_service = DEPLOYED_URL || "http://localhost:5000";
export const chat_service = DEPLOYED_URL || "http://localhost:5002";

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
    // FIX 3: Export this so you can update it from Socket component
    setOnlineUsers: React.Dispatch<React.SetStateAction<string[]>>; 
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps{
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({children})=>{
    const [user,setUser] = useState<User | null>(null)
    const [isAuth, setIsAuth] = useState(false)
    const [loading, setLoading] =useState(true)
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    
    // Chats and Users State
    const [chats, setChats] = useState<Chats[] | null>(null)
    const[users,setUsers] = useState<User[]|null>(null)

    async function fetchUser(){
        try {
            const token = Cookies.get("token")
            if (!token) {
                setLoading(false);
                return;
            }
            const {data} = await axios.get(`${user_service}/api/v1/user/me`,{
                headers:{ Authorization: `Bearer ${token}` }
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
        setChats(null); // Clear chats on logout
        toast.success("User Logged Out")
    }

    async function fetchChats() {
        const token = Cookies.get("token")
        if(!token) return; // Guard clause
        try {
            const {data} = await axios.get(`${chat_service}/api/v1/chat/all`,{
                headers:{ Authorization: `Bearer ${token}` },
            });
            setChats(data.chats);
        } catch (error) {
            console.log(error);
        }
    }

    async function fetchUsers(){
        const token = Cookies.get("token")
        if (!token) return; 
        try {
            const {data} = await axios.get(`${user_service}/api/v1/user/all`,{
                headers:{ Authorization: `Bearer ${token}` }
            })
            setUsers(data)
        } catch (error) {
            console.log(error);
        }
    }

    // Initial Auth Check
    useEffect(()=>{
        fetchUser();
    },[])

    // FIX 2: Separate useEffect. Only fetch data when isAuth becomes true.
    useEffect(() => {
        if(isAuth) {
            fetchChats();
            fetchUsers();
        }
    }, [isAuth]); 

    return (
        <AppContext.Provider value={{
            user,
            setUser, 
            isAuth, 
            setIsAuth,
            loading,
            logoutUser,
            fetchChats,
            fetchUsers,
            users,
            chats,
            setChats,
            onlineUsers,
            setOnlineUsers // Added here
        }}>
            {children}
            <Toaster/>
        </AppContext.Provider>
    )
}

export const useAppData = () : AppContextType =>{
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within AppProvider");
    }
    return context;
}