const express = require('express');
const Setting = require('../models/Setting');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    let setting = await Setting.findOne({ userId: req.user.id });

    if (!setting) {
      setting = await Setting.create({
        companyName: '',
        storeLocation: '',
        currency: '₹',
        lowStockLimit: 5,
        notificationEmail: '',
        invoicePrefix: 'INV',
        theme: 'dark',
        accentColor: '#6d7cff',
        lowStockAlerts: true,
        userId: req.user.id
      });
    }

    res.json({ setting });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.patch('/', authMiddleware, async (req, res) => {
  try {
    const updated = await Setting.findOneAndUpdate(
      { userId: req.user.id },
      { ...req.body, userId: req.user.id },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );

    res.json({ setting: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;