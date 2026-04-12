const express = require('express');
const Audit = require('../models/Audit');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    const audits = await Audit.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json({ audits });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audits' });
  }
});

module.exports = router;