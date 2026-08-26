const { body, param } = require("express-validator");

const MAX_MESSAGE_LENGTH = 2000;

const symptomCheckValidation = [
  body("message")
    .exists({ checkFalsy: true })
    .withMessage("Message is required")
    .bail()
    .isString()
    .withMessage("Message must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Message cannot be empty")
    .bail()
    .isLength({ max: MAX_MESSAGE_LENGTH })
    .withMessage(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters`),
  body("conversationId")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("conversationId must be a string")
    .bail()
    .trim()
    .isLength({ max: 64 })
    .withMessage("conversationId is invalid"),
];

const conversationIdParamValidation = [
  param("conversationId")
    .isString()
    .withMessage("conversationId must be a string")
    .bail()
    .trim()
    .isLength({ min: 8, max: 64 })
    .withMessage("conversationId is invalid"),
];

module.exports = {
  symptomCheckValidation,
  conversationIdParamValidation,
  MAX_MESSAGE_LENGTH,
};