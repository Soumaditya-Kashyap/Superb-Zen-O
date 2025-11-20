const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Helper function to generate token
const generateToken = (userId, role) => {
    return jwt.sign(
        { id: userId, role: role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

// Helper function to set cookie
const setTokenCookie = (res, token) => {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

exports.register = async (req, res) => {
    try {
        const { name, email, nickName, phone, password, confirmPassword } = req.body;

        // Validate required fields
        if (!name || !email || !nickName || !phone || !password || !confirmPassword) {
            return res.status(400).json({ 
                success: false,
                message: "All fields are required" 
            });
        }

        // Validate password match
        if (password !== confirmPassword) {
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

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase(),
            nickName,
            phone,
            password: hashedPassword,
        });

        // Generate token
        const token = generateToken(user._id, user.role);
        
        // Set cookie
        setTokenCookie(res, token);

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
                role: user.role
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error registering user",
            error: error.message 
        });
    }
};


exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: "Email and password are required" 
            });
        }

        // Find user
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ 
                success: false,
                message: "Invalid email or password" 
            });
        }

        // Generate token
        const token = generateToken(user._id, user.role);
        
        // Set cookie
        setTokenCookie(res, token);

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

// Get current user
exports.getCurrentUser = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: "User not found" 
            });
        }

        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                nickName: user.nickName,
                phone: user.phone,
                role: user.role,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt
            }
        });

    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error fetching user data",
            error: error.message 
        });
    }
};

// Logout user
exports.logout = async (req, res) => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.status(200).json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ 
            success: false,
            message: "Error logging out",
            error: error.message 
        });
    }
};

