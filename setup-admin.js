require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if admin already exists
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) {
            console.log('An admin user already exists.');
            process.exit(0);
        }

        // Get admin credentials
        const username = await question('Enter admin username: ');
        const password = await question('Enter admin password: ');

        // Validate password
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            throw new Error('Password must be at least 8 characters long');
        }
        if (!hasUpperCase || !hasLowerCase) {
            throw new Error('Password must contain both uppercase and lowercase letters');
        }
        if (!hasNumbers) {
            throw new Error('Password must contain at least one number');
        }
        if (!hasSpecialChar) {
            throw new Error('Password must contain at least one special character');
        }

        // Create admin user
        const admin = new User({
            username,
            password,
            role: 'admin'
        });

        await admin.save();
        console.log('Admin user created successfully!');
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        rl.close();
        process.exit(0);
    }
}

setupAdmin(); 