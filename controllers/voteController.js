const crypto = require('crypto');
const Vote = require('../models/Vote');
const UsedToken = require('../models/UsedToken');
const fs = require('fs');
const path = require('path');

// Genesis hash used for the very first vote in the chain
const GENESIS_HASH = '0';

/**
 * POST /api/votes/verify-pass
 * Validates a mock Voter Pass token and checks it hasn't been used already.
 */
exports.verifyPass = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token || typeof token !== 'string' || token.trim().length === 0) {
            return res.status(400).json({ error: 'Invalid or missing voter pass token.' });
        }

        // Check token format
        const isValid = token.startsWith('MOCK-VOTER-PASS-');
        if (!isValid) {
            return res.status(401).json({ error: 'Voter pass verification failed.' });
        }

        // Check if this token has already been used to cast a vote
        const alreadyUsed = await UsedToken.findOne({ token });
        if (alreadyUsed) {
            return res.status(403).json({ error: 'This voter pass has already been used. Each pass can only be used once.' });
        }

        res.status(200).json({
            message: 'Voter pass verified successfully.',
            authorized: true,
            token // Send token back so frontend can include it when casting
        });
    } catch (error) {
        console.error('verifyPass error:', error);
        res.status(500).json({ error: 'Voter pass verification failed.' });
    }
};

/**
 * POST /api/votes/cast
 * Receives an encrypted vote payload + voter token, chains it, and stores it.
 * Marks the token as used so it cannot vote again.
 */
exports.castVote = async (req, res) => {
    try {
        const { encryptedPayload, token } = req.body;

        if (!encryptedPayload || typeof encryptedPayload !== 'string') {
            return res.status(400).json({ error: 'Missing or invalid encrypted payload.' });
        }

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ error: 'Missing voter pass token.' });
        }

        // Double-check the token hasn't been used (race condition guard)
        const alreadyUsed = await UsedToken.findOne({ token });
        if (alreadyUsed) {
            return res.status(403).json({ error: 'This voter pass has already been used to cast a vote.' });
        }

        // 1. Get the previous hash (last vote in the chain, or genesis)
        const lastVote = await Vote.findOne().sort({ timestamp: -1 });
        const previousHash = lastVote ? lastVote.currentHash : GENESIS_HASH;

        // 2. Compute the current hash: SHA-256( previousHash + encryptedPayload )
        const currentHash = crypto
            .createHash('sha256')
            .update(previousHash + encryptedPayload)
            .digest('hex');

        // 3. Save to the ledger
        const newVote = new Vote({
            encryptedPayload,
            previousHash,
            currentHash
        });

        await newVote.save();

        // 4. Mark token as used — this pass can never vote again
        await new UsedToken({ token }).save();

        console.log(`Vote recorded — chain position: ${lastVote ? 'appended' : 'genesis'}`);

        res.status(201).json({
            message: 'Vote cast successfully.',
            voteHash: currentHash
        });
    } catch (error) {
        console.error('castVote error:', error);
        res.status(500).json({ error: 'Failed to cast vote.' });
    }
};

/**
 * GET /api/votes/public-key
 * Serves the RSA public key so the frontend can encrypt votes client-side.
 */
exports.getPublicKey = async (req, res) => {
    try {
        const publicKeyPath = path.join(__dirname, '..', 'keys', 'public.pem');

        if (!fs.existsSync(publicKeyPath)) {
            return res.status(500).json({ error: 'Encryption keys not generated. Run scripts/generateKeys.js first.' });
        }

        const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
        res.status(200).json({ publicKey });
    } catch (error) {
        console.error('getPublicKey error:', error);
        res.status(500).json({ error: 'Failed to retrieve public key.' });
    }
};

/**
 * GET /api/votes/verify-chain
 * Walks through every vote in chronological order and verifies:
 *   1. Each vote's previousHash matches the prior vote's currentHash
 *   2. Each vote's currentHash matches SHA-256(previousHash + encryptedPayload)
 * Returns the full verification report.
 */
exports.verifyChain = async (req, res) => {
    try {
        const votes = await Vote.find().sort({ timestamp: 1 });

        if (votes.length === 0) {
            return res.status(200).json({
                intact: true,
                totalVotes: 0,
                message: 'No votes in the ledger yet.',
                links: []
            });
        }

        const links = [];
        let chainIntact = true;

        for (let i = 0; i < votes.length; i++) {
            const vote = votes[i];
            const expectedPreviousHash = i === 0 ? GENESIS_HASH : votes[i - 1].currentHash;

            // Check 1: Does previousHash match the prior vote's currentHash?
            const linkValid = vote.previousHash === expectedPreviousHash;

            // Check 2: Recompute the hash — does it match what's stored?
            const recomputedHash = crypto
                .createHash('sha256')
                .update(vote.previousHash + vote.encryptedPayload)
                .digest('hex');
            const hashValid = recomputedHash === vote.currentHash;

            const valid = linkValid && hashValid;
            if (!valid) chainIntact = false;

            links.push({
                position: i + 1,
                currentHash: vote.currentHash.slice(0, 16) + '...',
                previousHash: vote.previousHash.slice(0, 16) + '...',
                linkValid,
                hashValid,
                valid
            });
        }

        res.status(200).json({
            intact: chainIntact
        });
    } catch (error) {
        console.error('verifyChain error:', error);
        res.status(500).json({ error: 'Failed to verify chain.' });
    }
};
