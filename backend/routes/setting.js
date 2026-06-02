const express = require("express");

const router = express.Router();

const {
    changePassword
} = require("../controllers/setting");

router.post(
    "/change-password",
    changePassword
);

module.exports = router;