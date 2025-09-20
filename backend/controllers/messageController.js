// controllers/MessageController.js
const MessageService = require("../services/messageService");
const {checkValidation} = require("../utils")


class MessageController {
  static async sendMessage(req, res) {
    checkValidation(req);

    try {
      // const senderUserId = req.user.id; // normally set by your auth middleware
      const senderUserId = req.user.user_id; // testing fallback
      console.log("senderUserId", senderUserId)
      const {
        chatId,
        messageType = "text",
        body = null,
        mediaId = null,
        quotedMessageId = null,
        editOf = null,
        ephemeralExpiresAt = null,
        metadata = {}
      } = req.body;

      const msg = await MessageService.sendMessage({
        chatId,
        senderUserId,
        messageType,
        body,
        mediaId,
        quotedMessageId,
        editOf,
        ephemeralExpiresAt,
        metadata
      });

      res.status(201).json(msg);
    } catch (err) {
      console.error("Error sending message:", err);
      res.status(400).json({ error: err.message });
    }
  }

  static async getChatMessages(req, res) {
    try {
      // const requesterUserId = req.user.id;
      const requesterUserId = 1; // testing fallback
      const { chatId } = req.params;
      const { limit, beforeSeq } = req.query;

      // io not needed here unless you want live "message history fetch" events
      // const messageService = new MessageService();

      const list = await MessageService.getChatMessages({
        chatId,
        requesterUserId,
        limit: limit ? Math.min(parseInt(limit, 10) || 50, 200) : 50,
        beforeSeq: beforeSeq ? parseInt(beforeSeq, 10) : null
      });

      res.json({success: true, data: list});
    } catch (err) {
      console.error("Error getting chat messages:", err);
      res.status(400).json({ error: err.message });
    }
  }

  static async markDelivered(req, res) {
    checkValidation(req);

    try {
      // const userId = req.user.id;
      const userId = 1; // testing fallback
      const { messageId } = req.params;

      const messageService = new MessageService();
      const result = await messageService.markDelivered({ messageId, userId });

      // Broadcast delivery event
      const io = req.app.get("io");
      io.to(`message-${messageId}`).emit("message:delivered", { messageId, userId });

      res.json(result);
    } catch (err) {
      console.error("Error marking delivered:", err);
      res.status(400).json({ error: err.message });
    }
  }

  static async markRead(req, res) {
    checkValidation(req);

    try {
      // const userId = req.user.id;
      const userId = 1; // testing fallback
      const { messageId } = req.params;

      // const messageService = new MessageService();
      const result = await MessageService.markRead({ messageId, userId });

      // Broadcast read event
      const io = req.app.get("io");
      io.to(`message-${messageId}`).emit("message:read", { messageId, userId });

      res.json(result);
    } catch (err) {
      console.error("Error marking read:", err);
      res.status(400).json({ error: err.message });
    }
  }

  static async markChatReadUpTo(req, res) {
    checkValidation(req);

    try {
      // const userId = req.user.id;
      const userId = 1; // testing fallback
      const { chatId } = req.params;
      const { uptoSeq } = req.body;

      // const messageService = new MessageService();
      const result = await MessageService.markChatReadUpTo({
        chatId,
        uptoSeq: parseInt(uptoSeq, 10),
        userId
      });

      // Broadcast read-up-to event
      const io = req.app.get("io");
      io.to(`chat-${chatId}`).emit("chat:readUpTo", { chatId, uptoSeq, userId });

      res.json(result);
    } catch (err) {
      console.error("Error marking chat read up to:", err);
      res.status(400).json({ error: err.message });
    }
  }

  static async deleteMessage(req, res) {
    try {
      // const requesterUserId = req.user.id;
      const requesterUserId = 1; // testing fallback
      const { messageId } = req.params;

      // const messageService = new MessageService();
      const deleted = await MessageService.deleteMessage({ messageId, requesterUserId });

      if (!deleted) return res.status(403).json({ error: "Not allowed" });

      // Broadcast message delete event
      const io = req.app.get("io");
      io.to(`chat-${deleted.chatId}`).emit("message:deleted", {
        deleted: true,
        messageId: deleted.id
      });

      res.json({ deleted: true, messageId: deleted.id });
    } catch (err) {
      console.error("Error deleting message:", err);
      res.status(400).json({ error: err.message });
    }
  }
}

module.exports = MessageController;
