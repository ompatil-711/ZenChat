"use client"

import { createContext, ReactNode, useContext, useState } from "react";

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
}

const AppContext = createContext<AppContextType | undefined>(undefined)

interface AppProviderProps{
    childern: ReactNode;

}

export const AppProvider: React.FC<AppProviderProps> = ({childern})=>{
    const [user,setUser] = useState<User | null>(null)
    const [isAuth, setIsAuth] = useState(false)
    const [loading, setLoading] =useState(true)

    return <AppContext.Provider  value={{user,setUser, isAuth, setIsAuth,loading}}>{childern}</AppContext.Provider>
}

export const useAppData = () : AppContextType =>{
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useAppData must be used within AppProvider");
    }
    return context;
}