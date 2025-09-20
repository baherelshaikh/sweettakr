// services/userService.js
const pool = require("../db"); // pg Pool instance

class UserService {
  static async getProfile(userId) {
    const result = await pool.query(
      `SELECT id, phone_number, name, about, profile_picture, last_seen_at, is_active 
       FROM users WHERE id = $1`,
      [userId]
    );
    return result.rows[0];
  }

  static async updateProfile(userId, data) {
    const { name, bio, profile_picture, status } = data;
    const result = await pool.query(
      `UPDATE users 
       SET name = $1, bio = $2, profile_picture = $3, status = $4 
       WHERE id = $5 
       RETURNING id, phone, name, bio, profile_picture, status`,
      [name, bio, profile_picture, status, userId]
    );
    return result.rows[0];
  }

  static async searchByPhone(phone) {
    const result = await pool.query(
      `SELECT id, phone_number, name, about, profile_picture, is_active, last_seen_at
       FROM users WHERE phone_number = $1`,
      [phone]
    );
    return result.rows;
  }

  static async searchByName(name) {
    const result = await pool.query(
      `SELECT id, phone_number, name, about, profile_picture, is_active 
       FROM users WHERE name ILIKE $1`,
      [`%${name}%`]
    );
    return result.rows;
  }
}

module.exports = UserService;
