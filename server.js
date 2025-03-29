const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const { PDFDocument } = require('pdf-lib');
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const flash = require("connect-flash");
const User = require("./models/User");
const rateLimit = require('express-rate-limit');
const path = require('path');
require("dotenv").config();

const app = express();

// Rate limiting for login attempts
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Too many login attempts. Please try again after 15 minutes.'
});

// Basic middleware
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: 'lax'
    },
    name: 'sessionId',
    rolling: true
}));

// Flash messages configuration
app.use(flash());
app.use((req, res, next) => {
    res.locals.error = req.flash('error');
    next();
});

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

// Local Strategy
passport.use(new LocalStrategy(async (username, password, done) => {
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
        }
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return done(null, false, { message: 'Incorrect password.' });
        }
        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// Authentication middleware
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    // If it's an API request, return JSON response
    if (req.headers['content-type'] === 'application/json') {
        return res.status(401).json({ error: 'Authentication required' });
    }
    // For regular requests, redirect to login
    res.redirect('/login');
};

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    max_file_size: 10 * 1024 * 1024, // 10MB in bytes to match plan limit
    upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
    chunk_size: 6000000, // 6MB chunks for better upload handling
    timeout: 120000, // 2 minutes timeout
    resource_type: "raw",
    type: "upload"
});

// MongoDB Schemas
const PaperSchema = new mongoose.Schema({
    pid: Number,
    subjectname: String,
    pyear: Number,
    sem: String,
    examtype: String,
    slots: [String],
    plink: String
});

const NoteSchema = new mongoose.Schema({
    nid: Number,
    subjectname: String,
    topic: String,
    description: String,
    nlink: String,
    created_at: { type: Date, default: Date.now },
    isParts: Boolean,
    totalParts: Number
});

const Paper = mongoose.model('Paper', PaperSchema);
const Note = mongoose.model('Note', NoteSchema);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection failed:", err));

// Password validation middleware
const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (password.length < minLength) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }
    if (!hasUpperCase || !hasLowerCase) {
        return { isValid: false, message: 'Password must contain both uppercase and lowercase letters' };
    }
    if (!hasNumbers) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }
    if (!hasSpecialChar) {
        return { isValid: false, message: 'Password must contain at least one special character' };
    }
    return { isValid: true };
};

// File upload security
const storage = multer.memoryStorage();

const paperUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed"), false);
        }
        
        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            return cb(new Error("File size too large. Maximum size is 10MB"), false);
        }
        
        // Basic filename validation
        if (!file.originalname || file.originalname.length > 255) {
            return cb(new Error("Invalid filename"), false);
        }
        
        cb(null, true);
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Only allow one file per upload
    }
});

const noteUpload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Check file type
        if (file.mimetype !== "application/pdf") {
            return cb(new Error("Only PDF files are allowed"), false);
        }
        
        // Check file size (max 50MB for initial upload)
        if (file.size > 50 * 1024 * 1024) {
            return cb(new Error("File size too large. Maximum size is 50MB"), false);
        }
        
        // Basic filename validation
        if (!file.originalname || file.originalname.length > 255) {
            return cb(new Error("Invalid filename"), false);
        }
        
        cb(null, true);
    },
    limits: {
        fileSize: 50 * 1024 * 1024, // 50MB limit for initial upload
        files: 1 // Only allow one file per upload
    }
});

// Fetch Unique Subject Names for Papers
const getPaperSubjectNames = async () => {
    try {
        return await Paper.distinct('subjectname');
    } catch (err) {
        console.error("Error fetching paper subjects:", err);
        return [];
    }
};

// Fetch Unique Subject Names for Notes
const getNoteSubjectNames = async () => {
    try {
        return await Note.distinct('subjectname');
    } catch (err) {
        console.error("Error fetching note subjects:", err);
        return [];
    }
};

// Render Main Page with Subject List
app.get("/", async (req, res) => {
    try {
        const [paperSubjects, noteSubjects] = await Promise.all([
            getPaperSubjectNames(),
            getNoteSubjectNames()
        ]);
        res.render("main", {
            paperSubjects,
            noteSubjects,
            activeTab: 'papers',
            user: req.user
        });
    } catch (err) {
        res.send("Error fetching subjects: " + err.message);
    }
});

app.get("/uploadPaper", isAuthenticated, async (req, res) => {
    try {
        const subjectNameList = await getPaperSubjectNames();
        res.render("paperupload", { subjectNameList, user: req.user });
    } catch (err) {
        res.send("Error fetching subjects: " + err.message);
    }
});

app.post("/upload", isAuthenticated, paperUpload.single("pdf"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        console.log("Uploading to Cloudinary from buffer");

        const result = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                { resource_type: "raw", folder: "papers", format: "pdf", type: "upload", attachment: false },
                (error, uploadResult) => {
                    if (error) return reject(error);
                    resolve(uploadResult);
                }
            ).end(req.file.buffer);
        });

        const { subjectname, pyear, sem, examtype, slot } = req.body;
        const slots = Array.isArray(slot) ? slot : [slot];
        const plink = result.secure_url;

        const lastPaper = await Paper.findOne().sort({ pid: -1 });
        const newPid = lastPaper ? lastPaper.pid + 1 : 1;

        const paper = new Paper({
            pid: newPid,
            subjectname,
            pyear,
            sem,
            examtype,
            slots,
            plink
        });

        await paper.save();
        res.json({ message: "Paper uploaded successfully", cloudinary_url: plink });
    } catch (error) {
        console.error("Upload failed:", error);
        res.status(500).json({ error: "Upload failed", details: error });
    }
});

app.post("/getSubjectPapers", async (req, res) => {
    try {
        const subjectName = req.body.subjectName;
        const papers = await Paper.find({ subjectname: subjectName });
        res.render("papers", { papers, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});

app.post("/deletePaper/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Find the paper by pid
        const paper = await Paper.findOne({ pid: parseInt(id) });
        if (!paper) return res.status(404).json({ error: "Paper not found" });

        // 2. Get the public ID from the Cloudinary URL
        const publicId = paper.plink.split("/").pop().split(".")[0];
        // 3. Delete from Cloudinary (from 'papers' folder)
        await cloudinary.uploader.destroy(`papers/${publicId}`, { resource_type: "raw" });
        // 4. Delete from MongoDB
        await Paper.deleteOne({ pid: parseInt(id) });

        res.json({ message: "Paper deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: "Deletion failed", details: error });
    }
});

app.get("/uploadNote", isAuthenticated, async (req, res) => {
    try {
        const subjectNameList = await getNoteSubjectNames();
        res.render("noteupload", { subjectNameList, user: req.user });
    } catch (err) {
        res.send("Error fetching subjects: " + err.message);
    }
});

// Add this function to split PDF
async function splitPDF(buffer, pagesPerPart = 10) {
    try {
        // Load the PDF document
        const pdfDoc = await PDFDocument.load(buffer);
        const totalPages = pdfDoc.getPageCount();
        const parts = [];
        
        // Split into parts of specified pages
        for (let i = 0; i < totalPages; i += pagesPerPart) {
            const partDoc = await PDFDocument.create();
            const pageCount = Math.min(pagesPerPart, totalPages - i);
            
            // Copy pages to new document
            const copiedPages = await partDoc.copyPages(pdfDoc, Array.from(
                { length: pageCount },
                (_, index) => i + index
            ));
            
            copiedPages.forEach(page => partDoc.addPage(page));
            
            // Save the part
            const partBuffer = await partDoc.save();
            parts.push(partBuffer);
        }
        
        return parts;
    } catch (error) {
        console.error('Error splitting PDF:', error);
        throw error;
    }
}

// Add this function near the top with other utility functions
function cleanupTempFiles() {
    const tempDir = path.join(__dirname, 'temp');
    if (fs.existsSync(tempDir)) {
        fs.readdir(tempDir, (err, files) => {
            if (err) {
                console.error('Error reading temp directory:', err);
                return;
            }
            
            files.forEach(file => {
                const filePath = path.join(tempDir, file);
                fs.unlink(filePath, err => {
                    if (err) {
                        console.error('Error deleting temp file:', err);
                    }
                });
            });
        });
    }
}

// Update the note upload route
app.post("/uploadNote", isAuthenticated, noteUpload.single("pdf"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    try {
        const fileSize = req.file.size;
        const MAX_SINGLE_UPLOAD = 10 * 1024 * 1024; // 10MB
        
        if (fileSize <= MAX_SINGLE_UPLOAD) {
            // Handle normal upload for small files
            console.log("Uploading note to Cloudinary from buffer");

            const tempFilePath = `temp_${Date.now()}.pdf`;
            fs.writeFileSync(tempFilePath, req.file.buffer);

            const result = await cloudinary.uploader.upload(tempFilePath, {
                resource_type: "raw",
                folder: "notes",
                format: "pdf",
                type: "upload",
                attachment: false,
                chunk_size: 6000000,
                timeout: 120000,
                upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
            });

            fs.unlinkSync(tempFilePath);

            const { subjectname, topic, description } = req.body;
            const nlink = result.secure_url;

            const lastNote = await Note.findOne().sort({ nid: -1 });
            const newNid = lastNote ? lastNote.nid + 1 : 1;

            const note = new Note({
                nid: newNid,
                subjectname,
                topic,
                description,
                nlink
            });

            await note.save();
            res.json({ message: "Note uploaded successfully", cloudinary_url: nlink });
        } else {
            // Split and upload large files
            console.log("Splitting large PDF into parts");
            const parts = await splitPDF(req.file.buffer);
            const uploadResults = [];
            
            for (let i = 0; i < parts.length; i++) {
                const partFileName = `${req.file.originalname.replace('.pdf', '')}_part${i + 1}of${parts.length}.pdf`;
                const tempFilePath = `temp_${Date.now()}_${partFileName}`;
                
                try {
                    fs.writeFileSync(tempFilePath, parts[i]);
                    
                    const result = await cloudinary.uploader.upload(tempFilePath, {
                        resource_type: "raw",
                        folder: "notes",
                        format: "pdf",
                        type: "upload",
                        attachment: false,
                        chunk_size: 6000000,
                        timeout: 120000,
                        upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET
                    });
                    
                    uploadResults.push(result.secure_url);
                    fs.unlinkSync(tempFilePath);
                } catch (error) {
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                    throw error;
                }
            }
            
            const { subjectname, topic, description } = req.body;
            const lastNote = await Note.findOne().sort({ nid: -1 });
            const newNid = lastNote ? lastNote.nid + 1 : 1;
            
            const note = new Note({
                nid: newNid,
                subjectname,
                topic,
                description,
                nlink: uploadResults.join(','),
                isParts: true,
                totalParts: parts.length
            });
            
            await note.save();
            res.json({ 
                message: "Note uploaded successfully in parts", 
                parts: uploadResults,
                noteId: newNid
            });
        }
    } catch (error) {
        console.error("Upload failed:", error);
        res.status(500).json({ error: "Upload failed", details: error });
    }
});

app.post("/getSubjectNotes", async (req, res) => {
    try {
        const subjectName = req.body.subjectName;
        const notes = await Note.find({ subjectname: subjectName });
        res.render("notes", { notes, user: req.user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Database error");
    }
});

app.post("/deleteNote/:id", isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Find the note by nid
        const note = await Note.findOne({ nid: parseInt(id) });
        if (!note) return res.status(404).json({ error: "Note not found" });

        // 2. Handle split files
        if (note.isParts) {
            // If note is split into parts, delete each part
            const links = note.nlink.split(',');
            for (const link of links) {
                const publicId = link.split("/").pop().split(".")[0];
                await cloudinary.uploader.destroy(`notes/${publicId}`, { resource_type: "raw" });
            }
        } else {
            // If single file, delete it
            const publicId = note.nlink.split("/").pop().split(".")[0];
            await cloudinary.uploader.destroy(`notes/${publicId}`, { resource_type: "raw" });
        }

        // 3. Delete from MongoDB
        await Note.deleteOne({ nid: parseInt(id) });
        res.json({ message: "Note deleted successfully" });
    } catch (error) {
        console.error("Deletion failed:", error);
        res.status(500).json({ error: "Deletion failed", details: error });
    }
});

// Authentication Routes
app.get('/login', (req, res) => {
    res.render('login', { 
        error: req.flash('error'),
        user: req.user
    });
});

app.post('/login', loginLimiter, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// Admin middleware - only allow admin users
const isAdmin = (req, res, next) => {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next();
    }
    res.status(403).json({ error: 'Admin access required' });
};

// Admin Routes
app.get('/admin/manage', isAdmin, async (req, res) => {
    try {
        const users = await User.find({}, 'username role createdAt');
        res.render('admin/manage', { 
            users,
            currentUser: req.user,
            error: req.flash('error'),
            success: req.flash('success')
        });
    } catch (err) {
        res.status(500).json({ error: 'Error fetching users' });
    }
});

app.post('/admin/create', isAdmin, async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if username exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Validate password
        const passwordValidation = validatePassword(password);
        if (!passwordValidation.isValid) {
            return res.status(400).json({ error: passwordValidation.message });
        }

        // Create new admin user
        const user = new User({
            username,
            password,
            role: 'admin'
        });

        await user.save();
        res.json({ message: 'Admin account created successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error creating admin account' });
    }
});

app.post('/admin/delete/:id', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Prevent deleting the last admin
        const adminCount = await User.countDocuments({ role: 'admin' });
        const userToDelete = await User.findById(id);
        
        if (adminCount <= 1 && userToDelete.role === 'admin') {
            return res.status(400).json({ error: 'Cannot delete the last admin account' });
        }

        await User.findByIdAndDelete(id);
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Error deleting user' });
    }
});

// Admin routes
app.get("/admin/manage", isAuthenticated, isAdmin, async (req, res) => {
    res.render("admin/manage", { user: req.user });
});

app.get("/admin/delete", isAuthenticated, isAdmin, async (req, res) => {
    res.render("admin/delete", { user: req.user });
});

// Make user available to all views
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});

// Add cleanup on server startup
cleanupTempFiles();

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port.`);
    } else {
        console.error('Server error:', err);
    }
});
