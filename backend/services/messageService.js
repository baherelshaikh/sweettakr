const pool = require("../db");
const ChatService = require("../services/chatService");


class MessageService {
  constructor() {
    const io = req.app.get("io");

    this.io = io; // keep io reference
  }

  static async sendMessage({
    chatId,
    senderUserId,
    messageType = "text",
    body = null,
    mediaId = null,
    quotedMessageId = null,
    editOf = null,
    ephemeralExpiresAt = null,
    metadata = {}
  }) {
    try {
      await pool.query("BEGIN");

      let chat = await ChatService.getChatDetails(chatId);
      if (!chat) {
        const toUserId = metadata?.to;
        if (!toUserId) throw new Error("Missing 'toUserId' for new chat creation");

        chat = await ChatService.createChat(
          senderUserId,
          chatId,
          false,
          metadata?.name || "New Chat",
          null,
          [senderUserId, toUserId]
        ); 
        chatId = chat.id
      }

      // Verify membership
      const mem = await pool.query(
        `SELECT 1 FROM chat_members WHERE chat_id = $1 AND user_id = $2`,
        [chatId, senderUserId]
      );
      if (mem.rowCount === 0) throw new Error("Sender is not a member of this chat");


      // Lock chat row to allocate next seq safely
      await pool.query(`SELECT id FROM chats WHERE id = $1 FOR UPDATE`, [chatId]);
      const seqRes = await pool.query(
        `SELECT COALESCE(MAX(seq), 0) + 1 AS next_seq FROM messages WHERE chat_id = $1`,
        [chatId]
      );
      const nextSeq = seqRes.rows[0].next_seq;
      console.log(metadata)

      // Insert message
      const msgRes = await pool.query(
        `INSERT INTO messages
          (chat_id, sender_user_id, message_type, body, media_id, quoted_message_id, edit_of, ephemeral_expires_at, seq)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *,
          CASE
            WHEN $10 != 'Group' AND (SELECT is_active FROM users WHERE id = $10::bigint) = true THEN 'delivered'
            ELSE 'sending'
        END AS status;
        `,
        [
          chatId,
          senderUserId,
          messageType,
          body,
          mediaId,
          quotedMessageId,
          editOf,
          ephemeralExpiresAt,
          nextSeq,
          metadata.to
        ]
      );
      const message = msgRes.rows[0];

      // Create receipts for all other members (OK if already present)
      await pool.query(
        `INSERT INTO message_receipts (message_id, recipient_user_id)
         SELECT $1, cm.user_id
         FROM chat_members cm
         WHERE cm.chat_id = $2 AND cm.user_id <> $3
         ON CONFLICT (message_id, recipient_user_id) DO NOTHING`,
        [message.id, chatId, senderUserId]
      );

      await pool.query("COMMIT");

      // Emit event to pools in this chat room
      if (this.io) {
        this.io.to(chatId).emit("new_message", message);
      }
      
      return message;
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    } finally {
      // pool.release();
    }
  }


  static async markDelivered({ messageId, userId }) {
    // Avoid creating receipts for the sender
    const m = await pool.query(`SELECT sender_user_id FROM messages WHERE id = $1`, [messageId]);
    if (m.rowCount === 0) throw new Error("Message not found");
    if (m.rows[0].sender_user_id === Number(userId)) return { updated: 0 };

    const q = `
      INSERT INTO message_receipts (message_id, recipient_user_id, delivered_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (message_id, recipient_user_id)
      DO UPDATE SET delivered_at = COALESCE(message_receipts.delivered_at, EXCLUDED.delivered_at)
    `;
    const { rowCount } = await pool.query(q, [messageId, userId]);
    return { updated: rowCount };
  }

  static async markRead({ messageId, userId }) {
    // Avoid creating receipts for the sender
    const m = await pool.query(`SELECT sender_user_id FROM messages WHERE id = $1`, [messageId]);
    if (m.rowCount === 0) throw new Error("Message not found");
    if (m.rows[0].sender_user_id === Number(userId)) return { updated: 0 };

    const q = `
      INSERT INTO message_receipts (message_id, recipient_user_id, delivered_at, read_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (message_id, recipient_user_id)
      DO UPDATE SET
        delivered_at = COALESCE(message_receipts.delivered_at, EXCLUDED.delivered_at),
        read_at      = COALESCE(message_receipts.read_at, EXCLUDED.read_at)
    `;
    const { rowCount } = await pool.query(q, [messageId, userId]);
    return { updated: rowCount };
  }


  static async markChatReadUpTo({ chatId, uptoSeq, userId }) {
    const q = `
      INSERT INTO message_receipts (message_id, recipient_user_id, delivered_at, read_at)
      SELECT m.id, $2 AS recipient_user_id, NOW() AS delivered_at, NOW() AS read_at
      FROM messages m
      WHERE m.chat_id = $1
        AND m.seq <= $3
        AND m.sender_user_id <> $2
      ON CONFLICT (message_id, recipient_user_id)
      DO UPDATE SET
        delivered_at = COALESCE(message_receipts.delivered_at, EXCLUDED.delivered_at),
        read_at      = COALESCE(message_receipts.read_at, EXCLUDED.read_at)
    `;
    const { rowCount } = await pool.query(q, [chatId, userId, uptoSeq]);
    return { updated: rowCount };
  }

  static async getChatMessages({ chatId, requesterUserId, limit = 0, beforeSeq = null }) {
    const params = [chatId];
    let where = `m.chat_id = $1`;
    if (beforeSeq) {
      params.push(beforeSeq);
      where += ` AND m.seq < $${params.length}`;
    }
    // if (limit > 0){
    //   params.push(limit);
    // }

    const q = `
        SELECT * 
          FROM (
              SELECT
                  m.id,
                  m.chat_id,
                  m.sender_user_id,
                  u.name AS sender_name,
                  u.profile_picture AS sender_avatar,
                  m.created_at,
                  m.server_received_at,
                  m.message_type,
                  m.body,
                  m.media_id,
                  m.quoted_message_id,
                  m.edit_of,
                  m.ephemeral_expires_at,
                  m.seq,
                  m.metadata,
                  r.delivered_at AS my_delivered_at,
                  r.read_at      AS my_read_at,
                  CASE
                      WHEN r.read_at IS NOT NULL THEN 'read'
                      WHEN r.delivered_at IS NOT NULL THEN 'sent'
                      ELSE 'sending'
                  END AS status
              FROM messages m
              JOIN users u ON u.id = m.sender_user_id
              LEFT JOIN message_receipts r
                ON r.message_id = m.id
              WHERE ${where}
              ORDER BY m.created_at DESC
          ) sub
          ORDER BY created_at ASC;
          `;
          // AND r.recipient_user_id = $${params.length + 1}
          // "LIMIT $${params.length}" put it in the line 197 and uncomment the pushed limit
          //  if you want to limit
    // params.push(requesterUserId);

    const { rows } = await pool.query(q, params);
    return rows;
  }

  //  Delete a message by its sender 
  static async deleteMessage({ messageId, requesterUserId }) {
    const { rows } = await pool.query(
      `DELETE FROM messages
       WHERE id = $1 AND sender_user_id = $2
       RETURNING id`,
      [messageId, requesterUserId]
    );
    return rows[0] || null;
  }

  // Add at the bottom (exported class already exists)
  static async getMessageMeta(messageId) {
    const { rows } = await pool.query(
      `SELECT id, chat_id, sender_user_id, seq FROM messages WHERE id = $1`,
      [messageId]
    );
    return rows[0] || null;
  }
}

module.exports = MessageService;
