const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Team = require('../models/Team.model');
const User = require('../models/User.model');
const { v4: uuidv4 } = require('uuid');

// Create team
router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();

    const team = await Team.create({
      name,
      description,
      admin: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }],
      inviteCode,
    });

    await User.findByIdAndUpdate(req.user._id, { team: team._id, role: 'admin' });

    await team.populate('members.user', 'name email avatar');
    res.status(201).json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create team' });
  }
});

// Get team details
router.get('/:id', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members.user', 'name email avatar isOnline')
      .populate('admin', 'name email avatar');
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    res.status(200).json({ success: true, team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch team' });
  }
});

// Join team by invite code
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    const team = await Team.findOne({ inviteCode });
    if (!team) return res.status(404).json({ success: false, message: 'Invalid invite code' });

    const isMember = team.members.some(m => m.user.toString() === req.user._id.toString());
    if (isMember) return res.status(400).json({ success: false, message: 'Already a member' });

    team.members.push({ user: req.user._id, role: 'member' });
    await team.save();
    await User.findByIdAndUpdate(req.user._id, { team: team._id });

    res.status(200).json({ success: true, message: 'Joined team successfully', team });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to join team' });
  }
});

// Remove a member from team (admin only)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });
    if (team.admin.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only admin can remove members' });
    }
    team.members = team.members.filter(m => m.user.toString() !== req.params.userId);
    await team.save();
    await User.findByIdAndUpdate(req.params.userId, { team: null, role: 'member' });
    res.status(200).json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
});

module.exports = router;