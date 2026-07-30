const express = require("express");
const { registerUser, loginUser, getMe } = require("../controllers/authController");
const { registerValidation, loginValidation } = require("../validations/authValidation");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", registerValidation, registerUser);
router.post("/login", loginValidation, loginUser);
router.get("/me", authenticate, getMe);

module.exports = router;
