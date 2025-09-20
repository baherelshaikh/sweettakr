const ChatService = require("../services/chatService");
const {checkValidation} = require("../utils")


class ChatController {

  // Create chat
  static async createChat(req, res) {
    checkValidation(req);

    try {
      const { userId, isGroup, title, description, members } = req.body;
      const chat = await ChatService.createChat(userId, isGroup, title, description, members);
      res.status(201).json(chat);
    } catch (error) {
        console.log(error)
      res.status(500).json({ error: error.message });
    }
  }

  // Get all chats for a user
  static async getUserChats(req, res) {
    try {
      const { userId } = req.params;
      const chats = await ChatService.getUserChats(userId);
      res.json(chats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  static async getChatUnreadCount(req, res) {
    try {
      const { userId, chatId } = req.params;
      const unreadCount = await ChatService.getChatUnreadCount(chatId, userId);
      res.json(unreadCount);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get details of a chat
  static async getChatDetails(req, res) {
    try {
      const { chatId } = req.params;
      const chat = await ChatService.getChatDetails(chatId);
      res.json(chat);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = ChatController;
