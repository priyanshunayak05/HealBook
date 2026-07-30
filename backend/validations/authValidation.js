const { body } = require("express-validator");

const registerValidation = [
  body("name", "Name is required").notEmpty().trim(),
  body("email", "Please include a valid email").isEmail().normalizeEmail(),
  body("password", "Password must be at least 6 characters").isLength({ min: 6 }),
  body("phone", "Phone number is required").notEmpty().trim(),
];

const loginValidation = [
  body("email", "Please include a valid email").isEmail().normalizeEmail(),
  body("password", "Password is required").exists(),
];

module.exports = { registerValidation, loginValidation };
