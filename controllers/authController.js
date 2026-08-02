const crypto = require('crypto');
const Voter = require('../models/Voter');

/**
 * POST /api/auth/register
 * Registers a new voter. Requires fullName and dateOfBirth.
 * Government ID is optional — if provided, it's SHA-256 hashed for duplicate detection.
 * Returns an anonymous token for the voter pass.
 */
exports.register = async (req, res) => {
    try {
        const { fullName, dateOfBirth, govId } = req.body;

        if (!fullName || typeof fullName !== 'string' || fullName.trim().length === 0) {
            return res.status(400).json({ error: 'Full name is required.' });
        }

        if (!dateOfBirth || typeof dateOfBirth !== 'string' || dateOfBirth.trim().length === 0) {
            return res.status(400).json({ error: 'Date of birth is required.' });
        }

        const cleanName = fullName.trim();
        const cleanDob = dateOfBirth.trim();

        // 1. Age Eligibility Check (Must be at least 18 years old)
        const dobDate = new Date(cleanDob);
        if (isNaN(dobDate.getTime())) {
            return res.status(400).json({ error: 'Invalid Date of Birth format.' });
        }

        const today = new Date();
        let age = today.getFullYear() - dobDate.getFullYear();
        const monthDiff = today.getMonth() - dobDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dobDate.getDate())) {
            age--;
        }

        if (age < 18) {
            return res.status(400).json({ error: 'Registration Ineligible: You must be at least 18 years old to vote.' });
        }


        // 1. Generate identity hash for duplicate detection
        // If govId is provided, hash govId; otherwise hash (fullName + DOB)
        const hashSource = govId && typeof govId === 'string' && govId.trim().length > 0
            ? govId.trim()
            : `${cleanName.toLowerCase()}_${cleanDob}`;

        const idHash = crypto.createHash('sha256').update(hashSource).digest('hex');

        // 2. Duplicate Detection
        const existing = await Voter.findOne({ idHash });
        if (existing) {
            return res.status(400).json({ error: 'Voter identity is already registered in the system.' });
        }

        // 3. Issue Anonymous Cryptographic Token & Voter ID
        const voterId = crypto.randomBytes(4).toString('hex').toUpperCase();
        const anonymousToken = `DCVS-TOKEN-${voterId}-${crypto.randomBytes(16).toString('hex')}`;

        // 4. Save to Database
        const newVoter = new Voter({
            fullName: cleanName,
            dateOfBirth: cleanDob,
            idHash,
            anonymousToken
        });
        await newVoter.save();

        // 5. Return pass data for PDF generation & download
        res.status(201).json({
            message: 'Registration successful.',
            pass: {
                type: 'VOTER_PASS',
                voterId,
                fullName: cleanName,
                dateOfBirth: cleanDob,
                token: anonymousToken,
                issuedAt: newVoter.registeredAt.toISOString()
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'A duplicate registration was detected.' });
        }
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
};