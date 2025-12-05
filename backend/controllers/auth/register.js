/**
 * Register Controller
 * Handles user registration
 */

const User = require('../../models/user');
const bcrypt = require('bcryptjs');
const { generateToken, setTokenCookie } = require('./helpers');

/**
 * Register a new user
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
    try {
        const { name, email, nickName, phone, password, confirmPassword, languages, genres } = req.body;
        
        console.log('[AUTH] Registration attempt for: ' + email);
        console.log('[AUTH] NickName: ' + nickName);
        console.log('[AUTH] Languages: ' + (languages || []).join(', '));
        console.log('[AUTH] Genres: ' + (genres || []).join(', '));

        // Validate required fields
        if (!name || !email || !nickName || !phone || !password) {
            console.log('[AUTH] Registration failed: Missing required fields');
            return res.status(400).json({ 
                success: false,
                message: "All fields are required" 
            });
        }

        // Validate password match if confirmPassword is provided
        if (confirmPassword && password !== confirmPassword) {
            return res.status(400).json({ 
                success: false,
                message: "Passwords do not match" 
            });
        }

        // Validate password length
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: "Password must be at least 6 characters long" 
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ 
                success: false,
                message: "Email already registered" 
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        const finalRole = req.body.role === "admin" ? "admin" : "user";

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            nickName,
            phone,
            role: finalRole,
            password: hashedPassword,
            preferences: {
                languages: languages || [],
                genres: genres || []
            }
        });

        // Generate token
        const token = generateToken(user._id, user.role);
        
        // Set cookie
        setTokenCookie(res, token);
        
        console.log('[AUTH] User registered successfully: ' + user.email);
        console.log('[AUTH] Preferences saved - Languages: ' + user.preferences.languages.join(', ') + ', Genres: ' + user.preferences.genres.join(', '));

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                nickName: user.nickName,
                phone: user.phone,
                role: user.role,
                preferences: user.preferences
            }
        });

    } catch (error) {
        console.error('[AUTH] Registration error:', error.message);
        return res.status(500).json({ 
            success: false,
            message: "Error registering user",
            error: error.message 
        });
    }
};
