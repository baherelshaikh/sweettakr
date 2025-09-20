const { body, param, query } = require("express-validator");
const CustomError = require("../errors");


const validateUserRegister = [
    body("name")
        .isString().withMessage("name must be a string")
        .trim()
        .notEmpty().withMessage("name is required"),

    body("phone_number")
        .isMobilePhone().withMessage("phone number must be a valid phone number")
        .notEmpty().withMessage("phone_number is required"),

    body("password_hash")
        .isString().withMessage("password must be a string")
        .isLength({ min: 6 }).withMessage("password must be at least 6 characters long")
        .notEmpty().withMessage("password is required"),
];

const validateLogin = [
    body("phone_number")
        .isMobilePhone().withMessage("phone number must be a valid phone number"),

    body("password_hash")
        .notEmpty().withMessage("password is required"),
];

const validateCreateChat = [
    body("userId")
        .isInt().withMessage("userId must be an integer")
        .notEmpty().withMessage("userId is required"),

    body("isGroup")
        .isBoolean().withMessage("isGroup must be true or false")
        .notEmpty().withMessage("isGroup is required"),

    body("title")
        .optional()
        .isString().withMessage("title must be a string")
        .trim(),

    body("members")
        .isArray().withMessage("members must be an array of userIds"),
];

const validateMessageUser = [
    body("messageId")
        .isInt().withMessage("messageId must be an integer")
        .notEmpty().withMessage("messageId is required"),

    body("userId")
        .isInt().withMessage("userId must be an integer")
        .notEmpty().withMessage("userId is required"),
];

const validateSendMessage = [
    body("chatId")
        .isUUID().withMessage("chatId must be a valid UUID")
        .notEmpty().withMessage("chatId is required"),

    body("messageType")
        .isIn(["text", "image", "video", "audio", "file"])
        .withMessage("messageType must be one of: text, image, video, audio, file"),

    body("body")
        .optional()
        .isString().withMessage("body must be a string"),

    body("mediaId")
        .optional({ nullable: true })
        .isUUID().withMessage("mediaId must be a valid UUID"),

    body("quotedMessageId")
        .optional({ nullable: true })
        .isUUID().withMessage("quotedMessageId must be a valid UUID"),

    body("editOf")
        .optional({ nullable: true })
        .isUUID().withMessage("editOf must be a valid UUID"),

    body("ephemeralExpiresAt")
        .optional({ nullable: true })
        .isISO8601().withMessage("ephemeralExpiresAt must be a valid date"),

    body("metadata")
        .optional()
        .isObject().withMessage("metadata must be an object"),
];

const validateMarkChatRead = [
    body("uptoSeq")
        .isInt().withMessage("uptoSeq must be an integer")
        .notEmpty().withMessage("uptoSeq is required"),
];

const validateIdParam = [
    param("id")
        .custom(value => {
            const isInt = /^\d+$/.test(value);
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

            if (!isInt && !isUUID) {
                throw new CustomError.BadRequestError("invalid id");
            }
            return true;
        })
];

const validateNameParam = [
    query("name")
        .isString().withMessage("name must be a string")
        .trim()
        .notEmpty().withMessage("name is required")
        .isLength({ min: 1, max: 50 }).withMessage("name must be between 1 and 50 characters"),
];

const validatePhoneParam = [
    query("phone")
        .isMobilePhone().withMessage("phone_number must be a valid phone number"),
]



module.exports = { 
    validateLogin,
    validateUserRegister,
    validateCreateChat,
    validateMarkChatRead,
    validateMessageUser,
    validateSendMessage,
    validateIdParam,
    validateNameParam,
    validatePhoneParam
};
