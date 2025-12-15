import mongoose from "mongoose";

const connectDb = async()=>{
    const url = process.env.MONGO_URI;

    if (!url){
        throw new Error("MONGO_URI is not defined in environement variable")
    }
    
}