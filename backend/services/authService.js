// const pool = require("../db");
const {query} = require("../db");
const jwt = require("jsonwebtoken");
require('dotenv').config();
const { StatusCodes } = require("http-status-codes");
const {hashPassword, verifyPassword} = require("../utils/bcrypt");
const {checkValidation, createJWT, jwtHandling, attachCookiesToResponse, isTokenValid} = require("../utils");
const CustomError = require('../errors')


class AuthService {
  static async registerUser({ phone_number, name, password_hash, profile_picture}) {
    const existingUser = await query(
      "SELECT * FROM users WHERE phone_number = $1",
      [phone_number]
    );

    if (existingUser.rows[0]) {
      throw new CustomError.NotFoundError(`Phone number already registered`)
    }

    password_hash = await hashPassword(password_hash, 10);

    if(!profile_picture) profile_picture = null;
        
    const newUser = await query(
      "INSERT INTO users (phone_number, password_hash, name, profile_picture) VALUES ($1, $2, $3, $4) RETURNING *",
      [phone_number, password_hash, name, profile_picture]
    );

    const readyUser = jwtHandling(newUser.rows[0]);
    const Token = createJWT({ payload: readyUser });

    return ({readyUser, Token});
  }

  static async loginUser({ phone_number, password_hash }) {
        // checkValidation(req);

        const user = await query(
          "SELECT * FROM users WHERE phone_number = $1",
          [phone_number]
        );
        const userData = user.rows[0];
    
        if (!userData) {
            throw new CustomError.UnauthenticatedError('Invalid phone number');
        }
    
        const storedPassword = userData.password_hash;
    
        const isPasswordValid = await verifyPassword(password_hash, storedPassword);
        if (!isPasswordValid) {
            throw new CustomError.UnauthorizedError("Invalid phone number or password");
        }
    
        const readyUser = jwtHandling(userData);
    
        const Token = createJWT({ payload: readyUser });
    
        return ({readyUser, Token});
    }
}

module.exports = AuthService;
