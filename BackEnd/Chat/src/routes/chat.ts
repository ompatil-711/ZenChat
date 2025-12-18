import express from "express";
import { createNewChat, getAllChats, sendMessage } from "../controllers/chat.js"; 
import { isAuth } from "../middlewares/isAuth.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// FIX: Added 'as express.RequestHandler' to ignore the type error
router.post("/new", isAuth, createNewChat as express.RequestHandler);
router.get("/all", isAuth, getAllChats as express.RequestHandler);
router.post("/message",isAuth,upload.single("image"),sendMessage as express.RequestHandler)

export default router;