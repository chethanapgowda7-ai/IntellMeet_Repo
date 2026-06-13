const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Meeting = require('../models/Meeting.model');
const Task = require('../models/Task.model');
const User = require('../models/User.model');

router.get('/overview', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const [totalMeetings, activeMeetings, completedMeetings, totalTasks, completedTasks, totalUsers] = await Promise.all([
      Meeting.countDocuments({ $or: [{ host: userId }, { 'participants.user': userId }] }),
      Meeting.countDocuments({ status: 'active' }),
      Meeting.countDocuments({ $or: [{ host: userId }, { 'participants.user': userId }], status: 'ended' }),
      Task.countDocuments({ $or: [{ createdBy: userId }, { assignedTo: userId }] }),
      Task.countDocuments({ $or: [{ createdBy: userId }, { assignedTo: userId }], status: 'completed' }),
      User.countDocuments(),
    ]);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const [meetingsPerDay, tasksByStatus] = await Promise.all([
      Meeting.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo }, host: userId } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Task.aggregate([
        { $match: { $or: [{ createdBy: userId }, { assignedTo: userId }] } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);
    res.status(200).json({ success: true, stats: { totalMeetings, activeMeetings, completedMeetings, totalTasks, completedTasks, totalUsers }, meetingsPerDay, tasksByStatus });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  }
});

module.exports = router;
