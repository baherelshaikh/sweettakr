const pool = require("../db");


class ChatService {
  // Create chat
  static async createChat(userId, chatId, isGroup, title, description, members) {
    try {
      await pool.query("BEGIN");

      const chatResult = await pool.query(
        `INSERT INTO chats (is_group, title, description, created_by, id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [isGroup, title || null, description || null, userId, chatId]
      );

      const chat = chatResult.rows[0];

      // Add creator as owner
      await pool.query(
        `INSERT INTO chat_members (chat_id, user_id, role)
         VALUES ($1, $2, 2)`,
        [chat.id, userId]
      );

      // Add other members
      if (members && members.length > 0) {
        for (const memberId of members) {
          if (memberId !== userId) {
            await pool.query(
              `INSERT INTO chat_members (chat_id, user_id, role)
               VALUES ($1, $2, 0)`,
              [chat.id, memberId]
            );
          }
        }
      }

      await pool.query("COMMIT");
      return chat;
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  // Get all chats for a user
  static async getUserChats(userId) {
    const result = await pool.query(
      `SELECT 
        c.id,
        c.is_group,
        c.title,
        c.description,
        c.profile_picture,
        c.created_by,
        c.created_at,
        c.properties,

        -- Get chat members as JSON array
        COALESCE(
            json_agg(
                DISTINCT jsonb_build_object(
                    'id', u.id,
                    'name', u.name,
                    'phone_number', u.phone_number,
                    'profile_picture', u.profile_picture,
                    'is_active', u.is_active,
                    'last_seen_at', u.last_seen_at,
                    'role', cm.role
                )
            ) FILTER (WHERE u.id IS NOT NULL), '[]'
        ) AS members,

        -- Get last message as JSON object
        (
            SELECT row_to_json(m)
            FROM messages m
            WHERE m.chat_id = c.id
            ORDER BY m.created_at DESC
            LIMIT 1
        ) AS last_message

    FROM chats c
    JOIN chat_members cm ON c.id = cm.chat_id
    JOIN users u ON cm.user_id = u.id
    WHERE c.id IN (
        SELECT cm2.chat_id
        FROM chat_members cm2
        WHERE cm2.user_id = $1
    )
    GROUP BY c.id, c.is_group, c.title, c.description, c.profile_picture, c.created_by, c.created_at, c.properties
    ORDER BY c.created_at DESC;
    `,
      [userId]
    );
    return result.rows;
  }

  static async getChatUnreadCount(chatId, userId) {
    const result = await pool.query(
      `SELECT COUNT(*) AS unread_count
       FROM messages m `+
       `LEFT JOIN message_receipts r ON m.id = r.message_id AND r.recipient_user_id = $2 ` +
       `WHERE m.chat_id = $1 AND (r.read_at IS NULL OR r.read_at < m.created_at) AND m.sender_user_id != $2`, 
      [chatId, userId]
    );
    return result.rows[0].unread_count;
  }

  // Get chat details
  static async getChatDetails(chatId) {
    const chatResult = await pool.query(
      `SELECT * FROM chats WHERE id = $1`,
      [chatId]
    );
    if (chatResult.rows.length === 0) return null;

    const membersResult = await pool.query(
      `SELECT u.id, u.name, u.phone_number, u.profile_picture, cm.role 
       FROM chat_members cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.chat_id = $1`,
      [chatId]
    );

    return {
      ...chatResult.rows[0],
      members: membersResult.rows,
    };
  }
}

module.exports = ChatService;
