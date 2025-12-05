/**
 * Login Controller
 * Handles user authentication
 */

const User = require('../../models/user');
const { generateToken, setTokenCookie } = require('./helpers');

/**
 * Login user
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        console.log('[AUTH] Login attempt for: ' + email);

        // Validate input
        if (!email || !password) {
            console.log('[AUTH] Login failed: Missing credentials');
            return res.status(400).json({ 
                success: false,
                message: "Email and password are required" 
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            console.log('[AUTH] Login failed: User not found');
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            console.log('[AUTH] Login failed: Invalid password');
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Generate token
        const token = generateToken(user._id, user.role);
        
        // Set cookie
        setTokenCookie(res, token);
        
        console.log('[AUTH] Login successful for: ' + user.email);
        console.log('[AUTH] Welcome back, ' + user.nickName);

        res.status(200).json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                nickName: user.nickName,
                phone: user.phone,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error logging in",
            error: error.message 
        });
    }
};
