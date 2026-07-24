import express from "express"
import {Register , Login, Logout, getChatHistory, saveChatMessage } from "../controllors/UserControllor.js"
import { isAunthenticated } from "../middleware/authmiddleware.js";

const router = express.Router()

router.route("/register").post(Register);
router.route("/login").post(Login);
router.route("/logout").post(Logout);

router.route("/chat-history").get(isAunthenticated, getChatHistory);
router.route("/chat-message").post(isAunthenticated, saveChatMessage);

export default router;