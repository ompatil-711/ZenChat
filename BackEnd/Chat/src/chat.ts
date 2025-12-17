import TryCatch from "./config/TryCatch.js";
import type { AuthenticatedRequest } from "./middlewares/isAuth.js";

export const createNewChat = TryCatch(async(req: AuthenticatedRequest,res)=>{
    const userId=req.user?._id;
    const {otherUserId} = req.body

    if(!otherUserId){
        res.status(400).json({
            message: "Other userId is required",
    });
       return; 
    }
})