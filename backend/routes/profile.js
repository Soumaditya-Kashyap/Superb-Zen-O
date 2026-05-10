const express = require("express");
const router = express.Router();

const upload = require("../middlewares/upload")

const {
    uploadProfilePicture
} = require("../controllers/auth/user");

router.post(
    "/upload-profile",
    upload.single("image"),
    uploadProfilePicture
);

module.exports = router;