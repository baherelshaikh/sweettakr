const express = require("express");
const AuthController = require("../controllers/authController");
const { validateLogin,  validateUserRegister} = require("../middleware/validation");

const router = express.Router();

router.post("/register",validateUserRegister, AuthController.register);
router.post("/login",validateLogin, AuthController.login);

module.exports = router;
