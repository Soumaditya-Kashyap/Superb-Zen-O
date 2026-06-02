const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");

const {
    createMessage,
} = require("../controllers/supportController");

// ✅ optional auth (login optional)
router.post("/", authMiddleware.optionalAuth, createMessage);

module.exports = router;