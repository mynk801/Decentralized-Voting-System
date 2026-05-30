const mongoose = require('mongoose');

const VoterSchema = new mongoose.Schema({
    // Inputted Data (Hashed for privacy)
    idHash: { type: String, required: true, unique: true },
    
    // Cryptographic Identity Keys
    publicKey: { type: String, required: true },
    
    // The "Voter's Token" for anonymous ballot casting
    anonymousToken: { type: String, required: true },
    
    registeredAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Voter', VoterSchema);