import express from "express";
import { loginUser, myProfile, verifyUser, getAllUsers } from "../controllers/user.js";
import { isAuth } from "../middleware/isAuth.js";
const router = express.Router();
router.post("/login", loginUser);
router.post("/verify", verifyUser);
router.get("/me", isAuth, myProfile);
router.get("/all", isAuth, getAllUsers);
export default router;
//# sourceMappingURL=user.js.map