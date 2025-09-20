// controllers/userController.js
const UserService = require("../services/userService");
const { StatusCodes } = require("http-status-codes");
const {checkValidation} = require("../utils")


class UserController {
  static async getProfile(req, res) {
    checkValidation(req);

    const user = await UserService.getProfile(req.params.id);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }
    res.status(StatusCodes.OK).json(user);
  }

  static async updateProfile(req, res) {
    checkValidation(req);

    const user = await UserService.updateProfile(req.params.id, req.body);
    res.status(StatusCodes.OK).json(user);
  }

  static async searchByPhone(req, res) {
    checkValidation(req);

    const user = await UserService.searchByPhone(req.query.phone);
    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ error: "User not found" });
    }
    res.status(StatusCodes.OK).json({success: true, data: user});
  }

  static async searchByName(req, res) {
    checkValidation(req);

    const users = await UserService.searchByName(req.query.name);
    res.status(StatusCodes.OK).json(users);
  }
}

module.exports = UserController;
