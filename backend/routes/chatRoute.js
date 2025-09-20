const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const { authenticateUser } = require('../middleware/authenticateUser');
const { validateCreateChat} = require("../middleware/validation");



router.use(authenticateUser);


// Create chat
router.post("/",validateCreateChat, chatController.createChat);

// Get all chats for a user
router.get("/user/:userId", chatController.getUserChats);

// Get unread message count for a chat
router.get("/unread/:userId/:chatId", chatController.getChatUnreadCount);

// Get details of a chat
router.get("/:chatId", chatController.getChatDetails);

module.exports = router;
