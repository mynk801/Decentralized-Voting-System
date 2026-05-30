const crypto = require('crypto');
const Voter = require('../models/Voter');

exports.register = async (req, res) => {
    try {
        const { govId } = req.body; 
        
        // 1. SHA-256 Hashing
        const idHash = crypto.createHash('sha256').update(govId).digest('hex');

        // 2. Duplicate Detection
        const existing = await Voter.findOne({ idHash });
        if (existing) return res.status(400).json({ error: "Identity already registered" });

        // 3. REMOVED: Ed25519 Keypair Generation

        // 4. Issue Anonymous Token
        const anonymousToken = crypto.randomBytes(32).toString('hex');

        // 5. Save to Database (Update fields accordingly)
        const newVoter = new Voter({ idHash, anonymousToken });
        await newVoter.save();

        res.status(201).json({ message: "Registration Successful", anonymousToken });
    } catch (error) {
        res.status(500).json({ error: "Pipeline failed" });
    }
};