const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Admin Auth
router.post('/login', adminController.login);

// Election Status Control
router.get('/status', adminController.getStatus);
router.post('/status', adminController.updateStatus);

// Registered Voter Roster & Status Tracker
router.get('/voters', adminController.getVoters);

module.exports = router;
