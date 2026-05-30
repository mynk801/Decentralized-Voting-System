console.log("Loading modules...");
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

console.log("Setting up middleware...");
app.use(express.json());
app.use(cors());

console.log("Setting up routes...");
app.use('/api/auth', require('./routes/authRoutes'));

console.log("Attempting database connection...");
mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log("Database connected!");
        app.listen(5000, () => console.log("Server active on port 5000"));
    })
    .catch(err => {
        console.error("Database connection failed:", err);
    });