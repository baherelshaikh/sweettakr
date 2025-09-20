const AuthService = require("../services/authService");
const { StatusCodes } = require("http-status-codes");
const {checkValidation} = require("../utils")

class AuthController {
  static async register(req, res) {
    checkValidation(req);

    const { phone_number, name, password_hash, profile_picture } = req.body;
    const {readyUser, Token} = await AuthService.registerUser({ phone_number, name, password_hash, profile_picture });
    
    res.status(StatusCodes.CREATED).json({succes: true, user: readyUser, Token });
  }

  static async login(req, res) {
    checkValidation(req);
    
    const { phone_number, password_hash } = req.body;
    const {readyUser, Token} = await AuthService.loginUser({ phone_number, password_hash});
    
    res.status(StatusCodes.OK).json({ success: true, user: readyUser, Token });
  }
}

module.exports = AuthController;
