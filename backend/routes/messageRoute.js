// routes/messageRoutes.js
const express = require("express");
const MessageController = require("../controllers/messageController");
// const authMiddleware = require("../middlewares/authMiddleware");
const { authenticateUser } = require('../middleware/authenticateUser');
const { validateMessageUser, validateSendMessage, validateMarkChatRead} = require("../middleware/validation");

const router = express.Router();

router.use(authenticateUser);


// Send a message
router.post("/",validateSendMessage, MessageController.sendMessage);

// Get messages for a chat (pagination via ?limit=&beforeSeq=)
router.get("/:chatId", MessageController.getChatMessages);

// Receipts
router.post("/:messageId/delivered",validateMessageUser, MessageController.markDelivered);
router.post("/:messageId/read",validateMessageUser, MessageController.markRead);
router.post("/:chatId/read-up-to",validateMarkChatRead, MessageController.markChatReadUpTo);

// Optional: delete by sender
router.delete("/:messageId", MessageController.deleteMessage);

module.exports = router;
