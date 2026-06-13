const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Message = require('../models/Message.model');

// Get messages for a meeting
router.get('/:meetingId', protect, async (req, res) => {
  try {
    const messages = await Message.find({ meeting: req.params.meetingId })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });
    res.status(200).json({ success: true, messages });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

module.exports = router;