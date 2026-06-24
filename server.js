console.log("Loading modules...");
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log("Setting up middleware...");
app.use(express.json());
app.use(cors());

// Health check endpoint (must be BEFORE the DB middleware so it doesn't get blocked)
app.get('/api/health', (req, res) => {
    const isConnected = mongoose.connection.readyState === 1;
    res.status(isConnected ? 200 : 503).json({
        status: isConnected ? 'online' : 'offline',
        dbState: mongoose.connection.readyState
    });
});

// Database connection state middleware (Must be BEFORE routes)
app.use((req, res, next) => {
    // strictly require readyState === 1 (connected). 
    // If 0 (disconnected) or 2 (connecting/reconnecting), reject immediately.
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Database connection lost. Please ensure MongoDB is running.' });
    }
    next();
});

console.log("Setting up routes...");
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/votes', require('./routes/voteRoutes'));

console.log("Attempting database connection...");

// Monitor connection events
mongoose.connection.on('disconnected', () => {
    console.error('⚠️ MongoDB disconnected!');
});
mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected!');
});

// Disable Mongoose buffering globally so queries instantly fail if DB is down
mongoose.set('bufferCommands', false);

mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000 // Fail fast if DB is down on startup
})
    .then(() => {
        console.log("✅ Database connected!");
        app.listen(5000, () => console.log("🚀 Server active on port 5000"));
    })
    .catch(err => {
        console.error("❌ Database connection failed at startup:", err.message);
        process.exit(1); // Exit the process so nodemon or the user knows it failed
    });