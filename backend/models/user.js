const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'],
        trim: true
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
    },
    nickName: { 
        type: String, 
        required: [true, 'Nickname is required'],
        trim: true
    },
    phone: { 
        type: String, 
        required: [true, 'Phone number is required'],
        trim: true
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    profilePicture: {
        type: String,
        default: null
    },
    role: { 
        type: String, 
        enum: ['user','admin'], 
        default: 'user' 
    }
    
}, { timestamps: true });

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON response
userSchema.methods.toJSON = function() {
    const user = this.toObject();
    delete user.password;
    return user;
};


module.exports = mongoose.model('user', userSchema);
