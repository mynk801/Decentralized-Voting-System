const mongoose = require('mongoose');

const VoteSchema = new mongoose.Schema({
    // The vote payload, encrypted client-side with the server's public key
    encryptedPayload: {
        type: String,
        required: true
    },

    // Hash of the previous vote in the chain (genesis vote uses "0")
    previousHash: {
        type: String,
        required: true
    },

    // SHA-256( previousHash + encryptedPayload )
    currentHash: {
        type: String,
        required: true,
        unique: true
    },

    // Timestamp of when the vote was recorded
    timestamp: {
        type: Date,
        default: Date.now
    }
});

// Index on timestamp for ordering and on currentHash for chain lookups
VoteSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Vote', VoteSchema);
