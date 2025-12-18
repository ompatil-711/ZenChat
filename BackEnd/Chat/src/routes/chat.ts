import express from "express";
import { createNewChat, getAllChats } from "../controllers/chat.js"; 
import {isAuth} from "../middlewares/isAuth.js";

const router = express.Router()

router.post("/new",isAuth,createNewChat)
router.get("/all", isAuth,getAllChats)
export default router;