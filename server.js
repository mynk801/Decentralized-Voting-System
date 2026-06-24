console.log("Loading modules...");
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log("Setting up middleware...");
app.use(express.json());
app.use(cors());

// Database connection state middleware (Must be BEFORE routes)
app.use((req, res, next) => {
    // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState !== 1 && mongoose.connection.readyState !== 2) {
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