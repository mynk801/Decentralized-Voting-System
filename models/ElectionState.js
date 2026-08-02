const mongoose = require('mongoose');

const ElectionStateSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['UPCOMING', 'LIVE', 'ENDED'],
        default: 'LIVE'
    },
    title: {
        type: String,
        default: 'General Decentralized Election 2026'
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('ElectionState', ElectionStateSchema);
