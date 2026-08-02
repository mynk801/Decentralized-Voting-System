const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    // Full Name & Date of Birth (Required for registration)
    fullName: { type: String, required: true },
    dateOfBirth: { type: String, required: true },

    // SHA-256 hash of government ID or identity tuple (optional if gov ID is omitted)
    idHash: { type: String, unique: true, sparse: true },

    // The anonymous token for ballot casting
    anonymousToken: { type: String, required: true, unique: true },

    registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voter', VoterSchema);