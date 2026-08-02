const express = require('express');
const router = express.Router();
const voteController = require('../controllers/voteController');

// Verify a Voter Pass (mock for midterm)
router.post('/verify-pass', voteController.verifyPass);

// Cast an encrypted vote
router.post('/cast', voteController.castVote);

// Serve the public encryption key to the frontend
router.get('/public-key', voteController.getPublicKey);

// Verify the integrity of the entire vote chain
router.get('/verify-chain', voteController.verifyChain);

// Get real-time vote tally (decrypted using private key)
router.get('/tally', voteController.getTally);

// Search for a specific vote receipt hash in the ledger
router.get('/receipt/:hash', voteController.verifyReceipt);

module.exports = router;
