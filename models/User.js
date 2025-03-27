const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    lastLogin: {
        type: Date
    },
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockedUntil: {
        type: Date
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw error;
    }
};

// Check if account is locked
userSchema.methods.isLocked = function() {
    return this.lockedUntil && this.lockedUntil > Date.now();
};

// Reset login attempts
userSchema.methods.resetLoginAttempts = function() {
    this.loginAttempts = 0;
    this.lockedUntil = null;
};

// Increment login attempts
userSchema.methods.incrementLoginAttempts = function() {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
        this.lockedUntil = Date.now() + 15 * 60 * 1000; // Lock for 15 minutes
    }
};

const User = mongoose.model('User', userSchema);

module.exports = User; 