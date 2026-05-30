const express = require('express');
const router = express.Router();

router.post('/register', (req, res) => {
    const { govId } = req.body;
    
    res.json({ message: 'Registered successfully', govId });
});

module.exports = router;