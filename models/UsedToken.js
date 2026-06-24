const mongoose = require('mongoose');

const UsedTokenSchema = new mongoose.Schema({
    // The token string from the Voter Pass
    token: {
        type: String,
        required: true,
        unique: true
    },

    // When this token was consumed (i.e. a vote was cast with it)
    usedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('UsedToken', UsedTokenSchema);
