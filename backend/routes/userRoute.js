// routes/userRoutes.js
const express = require("express");
const UserController = require("../controllers/userController");
const router = express.Router();
const { authenticateUser } = require('../middleware/authenticateUser');
const { validateIdParam, validateNameParam, validatePhoneParam} = require("../middleware/validation");

router.use(authenticateUser);


// Profile
router.get("/:id",validateIdParam, UserController.getProfile);
router.put("/:id",validateIdParam, UserController.updateProfile);

// Search
router.get("/search/phone",validatePhoneParam, UserController.searchByPhone);
router.get("/search/name",validateNameParam, UserController.searchByName);

module.exports = router;
