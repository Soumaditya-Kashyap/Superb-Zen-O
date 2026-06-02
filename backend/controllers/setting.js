

const User = require("../models/user");
const bcrypt = require("bcryptjs");

/**
 * Change Password
 * POST /api/update-password
 */

exports.changePassword = async (req, res) => {

    try {

        const userId = req.user.id;

        const {
            currentPassword,
            newPassword
        } = req.body;

        // Validation
        if (
            !currentPassword ||
            !newPassword 
           
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }


        // Password length
        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        // Find user
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check current password
        const isMatch = await bcrypt.compare(
            currentPassword,
            user.password
        );

        if (!isMatch) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(
            newPassword,
            12
        );

        // Save new password
        user.password = hashedPassword;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            success: false,
            message: "Error changing password"
        });
    }
};