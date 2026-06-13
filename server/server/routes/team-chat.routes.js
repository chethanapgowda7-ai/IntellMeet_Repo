const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const TeamMessage = require('../models/TeamMessage.model');

router.get('/:teamId', protect, async (req, res) => {
  try {
    const messages = await TeamMessage.find({ team: req.params.teamId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 })
      .limit(100);
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

module.exports = router;
