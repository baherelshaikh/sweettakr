// realtime/socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const ChatService = require("../services/chatService");
const MessageService = require("../services/messageService");
const { isTokenValid } = require("../utils/jwt");
require('dotenv').config();

const db = require("../db");

// Optional: move to env
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

class RealtimeGateway {
  constructor(server) {
    this.io = new Server(server, {
      cors: {
        origin: "*", // set your frontend origin in prod
        // origin: "http://localhost:5173", // set your frontend origin in prod
        methods: ["GET", "POST"]
      }
    });

    // userId -> Set<socketId>
    this.userSockets = new Map();

    this._registerAuthMiddleware();
    this._registerConnectionHandlers();
  }

  _registerAuthMiddleware() {
    // socket.auth token from either query ?token= or headers.authorization: Bearer
    this.io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.query?.token ||
          (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");

        if (!token) return next(new Error("Unauthorized"));
        const payload = isTokenValid({ token });
        // const { name, user_id, profile_picture} = isTokenValid({ token });
        socket.user = { id: Number(payload.user_id) };
        return next();
      } catch (e) {
        return next(new Error("Unauthorized"));
      }
    });
  }

  _trackConnection(socket) {
    const uid = socket.user.id;
    if (!this.userSockets.has(uid)) this.userSockets.set(uid, new Set());
    this.userSockets.get(uid).add(socket.id);
    // join a personal room so we can target a single user easily
    socket.join(`user:${uid}`);
  }

  _trackDisconnection(socket) {
    const uid = socket.user.id;
    const set = this.userSockets.get(uid);
    if (set) {
      set.delete(socket.id);
      if (set.size === 0) this.userSockets.delete(uid);
    }
  }

  async _joinUserChatRooms(socket) {
    // Join all chat rooms where the user is a member
    const uid = socket.user.id;
    const { rows } = await db.query(
      `SELECT chat_id FROM chat_members WHERE user_id = $1`,
      [uid]
    );
    for (const r of rows) socket.join(`chat:${r.chat_id}`);
  }

  _registerConnectionHandlers() {
    this.io.on("connection", async (socket) => {
      this._trackConnection(socket);

      try {
        await db.query(
          `UPDATE users SET is_active = true, last_seen_at = NOW() WHERE id = $1`,
          [socket.user.id]
        );

        this.io.emit("user:online", { userId: socket.user.id });
      } catch (e) {
        // non-fatal error, log if needed
        console.error("Failed to update online status:", e);
      }

      try {
        await db.query(
          `UPDATE message_receipts SET delivered_at = NOW() WHERE recipient_user_id = $1
            AND delivered_at IS NULL;`,
          [socket.user.id]
        );
      } catch (e) {
        // non-fatal error, log if needed
        console.error("Failed to update messages as delivered:", e);
      }

      // Mark user online (optional: store presence; update last_seen on disconnect)
      try {
        await this._joinUserChatRooms(socket);
      } catch (e) {
        // non-fatal
      }

      // ---- Messaging ----
      socket.on("message:send", async (payload, cb) => {
        try {
          const {
            chatId,
            messageType = "text",
            body = null,
            mediaId = null,
            quotedMessageId = null,
            editOf = null,
            ephemeralExpiresAt = null,
            metadata = {}
          } = payload || {};

          const msg = await MessageService.sendMessage({
            chatId,
            senderUserId: socket.user.id,
            messageType,
            body,
            mediaId,
            quotedMessageId,
            editOf,
            ephemeralExpiresAt,
            metadata
          });

          // Acknowledge to sender
          cb && cb({ ok: true, message: msg });

          // Broadcast to chat members (including other devices of sender)
          this.io.to(`chat:${msg.chat_id}`).emit("message:new", msg);
        } catch (err) {
          console.error("Error sending message:", err);
          cb && cb({ ok: false, error: err.message });
        }
      });

      // ---- Receipts (per message) ----
      socket.on("receipt:delivered", async ({ messageId }, cb) => {
        try {
          const userId = socket.user.id;
          const meta = await MessageService.getMessageMeta(messageId);
          if (!meta) throw new Error("Message not found");

          await MessageService.markDelivered({ messageId, userId });

          // Notify the sender only
          this.io.to(`user:${meta.sender_user_id}`).emit("receipt:delivered", {
            messageId,
            byUserId: userId,
            at: new Date().toISOString()
          });

          cb && cb({ ok: true });
        } catch (err) {
          cb && cb({ ok: false, error: err.message });
        }
      });

      socket.on("receipt:read", async ({ messageId }, cb) => {
        try {
          const userId = socket.user.id;
          const meta = await MessageService.getMessageMeta(messageId);
          if (!meta) throw new Error("Message not found");

          await MessageService.markRead({ messageId, userId });

          // Notify the sender only
          this.io.emit("receipt:read", {
            messageId,
            byUserId: userId,
            at: new Date().toISOString()
          });

          cb && cb({ ok: true });
        } catch (err) {
          cb && cb({ ok: false, error: err.message });
        }
      });

      // ---- Batch read-up-to (optional optimization) ----
      socket.on("chat:readUpTo", async ({ chatId, uptoSeq }, cb) => {
        try {
          const userId = socket.user.id;
          const result = await MessageService.markChatReadUpTo({
            chatId,
            uptoSeq: Number(uptoSeq),
            userId
          });

          // Inform chat room that this user read up to X (others update UI)
          this.io.emit("chat:readUpTo", {////
            chatId,
            byUserId: userId,
            uptoSeq: Number(uptoSeq)
          });

          cb && cb({ ok: true, updated: result.updated });
        } catch (err) {
          cb && cb({ ok: false, error: err.message });
        }
      });

      // ---- Typing indicators ----
      socket.on("typing", ({ chatId, isTyping }) => {
        socket.to(`chat:${chatId}`).emit("typing", {
          chatId,
          userId: socket.user.id,
          isTyping: !!isTyping
        });
      });

      // ---- Join/Leave chat rooms (if membership changes at runtime) ----
      socket.on("chat:join", async ({ chatId }, cb) => {
        try {
          // verify membership
          const { rowCount } = await db.query(
            `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
            [chatId, socket.user.id]
          );
          if (!rowCount) throw new Error("Not a member of this chat");
          socket.join(`chat:${chatId}`);
          cb && cb({ ok: true });
        } catch (err) {
          cb && cb({ ok: false, error: err.message });
        }
      });

      socket.on("chat:leave", ({ chatId }) => {
        socket.leave(`chat:${chatId}`);
      });

      // ---- Disconnect ----
      socket.on("disconnect", async () => {
        this._trackDisconnection(socket);
        // update last_seen_at
        try {
          await db.query(
            `UPDATE users SET is_active = false, last_seen_at = NOW() WHERE id = $1`,
            [socket.user.id]
          );
        } catch {}
      });
    });
  }
}

module.exports = (server) => new RealtimeGateway(server);
