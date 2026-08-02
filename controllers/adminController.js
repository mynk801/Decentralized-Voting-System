const ElectionState = require('../models/ElectionState');
const Voter = require('../models/Voter');
const UsedToken = require('../models/UsedToken');
const Vote = require('../models/Vote');

// Helper to ensure an ElectionState document exists
async function getOrCreateElectionState() {
    let state = await ElectionState.findOne();
    if (!state) {
        state = new ElectionState({ status: 'LIVE' });
        await state.save();
    }
    return state;
}

/**
 * POST /api/admin/login
 * Validates admin credentials (mynk801 / 1234)
 */
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (username === 'mynk801' && password === '1234') {
            return res.status(200).json({
                message: 'Admin authentication successful.',
                token: 'ADMIN-SESSION-MYNK801-SECRET-TOKEN',
                admin: { username: 'mynk801', role: 'Election Commissioner' }
            });
        }

        return res.status(401).json({ error: 'Invalid admin credentials. Please check your username and password.' });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Admin login failed.' });
    }
};

/**
 * GET /api/admin/status
 * Returns election status and voting summary metrics
 */
exports.getStatus = async (req, res) => {
    try {
        const state = await getOrCreateElectionState();
        const totalRegistered = await Voter.countDocuments();
        const totalVoted = await UsedToken.countDocuments();

        res.status(200).json({
            status: state.status,
            title: state.title,
            updatedAt: state.updatedAt,
            totalRegistered,
            totalVoted
        });
    } catch (err) {
        console.error('Error fetching admin status:', err);
        res.status(500).json({ error: 'Failed to fetch election status.' });
    }
};

/**
 * POST /api/admin/status
 * Toggles or updates election status (LIVE, ENDED, UPCOMING)
 */
exports.updateStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['LIVE', 'ENDED', 'UPCOMING'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value. Must be LIVE, ENDED, or UPCOMING.' });
        }

        let state = await getOrCreateElectionState();
        state.status = status;
        state.updatedAt = new Date();
        await state.save();

        res.status(200).json({
            message: `Election status updated to ${status}.`,
            status: state.status,
            updatedAt: state.updatedAt
        });
    } catch (err) {
        console.error('Error updating election status:', err);
        res.status(500).json({ error: 'Failed to update election status.' });
    }
};

/**
 * GET /api/admin/voters
 * Returns complete registered voters roster with voted status tracking
 */
exports.getVoters = async (req, res) => {
    try {
        const voters = await Voter.find().sort({ registeredAt: -1 });
        const usedTokensList = await UsedToken.find({}, { token: 1 });
        const usedSet = new Set(usedTokensList.map(u => u.token));

        const voterRoster = voters.map((voter) => {
            // Extract voterId portion from token (e.g., DCVS-TOKEN-4F2A-...)
            const parts = voter.anonymousToken ? voter.anonymousToken.split('-') : [];
            const voterIdDisplay = parts.length >= 3 ? parts[2] : 'VOTER';

            return {
                id: voter._id,
                fullName: voter.fullName,
                dateOfBirth: voter.dateOfBirth,
                registeredAt: voter.registeredAt,
                voterId: voterIdDisplay,
                hasVoted: usedSet.has(voter.anonymousToken)
            };
        });

        const totalRegistered = voterRoster.length;
        const totalVoted = voterRoster.filter(v => v.hasVoted).length;

        res.status(200).json({
            totalRegistered,
            totalVoted,
            pendingVoters: totalRegistered - totalVoted,
            voters: voterRoster
        });
    } catch (err) {
        console.error('Error fetching registered voters roster:', err);
        res.status(500).json({ error: 'Failed to fetch registered voters list.' });
    }
};
