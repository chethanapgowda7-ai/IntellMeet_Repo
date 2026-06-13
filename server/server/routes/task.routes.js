const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const Task = require('../models/Task.model');

// Get all tasks for user
router.get('/', protect, async (req, res) => {
  try {
    const tasks = await Task.find({
      $or: [{ createdBy: req.user._id }, { assignedTo: req.user._id }],
    })
      .populate('assignedTo', 'name avatar')
      .populate('createdBy', 'name avatar')
      .sort({ createdAt: -1 });
    
    console.log(`GET /tasks by user ${req.user._id} (${req.user.email}). Found ${tasks.length} tasks.`);
    res.status(200).json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch tasks' });
  }
});

// Create task
router.post('/', protect, async (req, res) => {
  try {
    const task = await Task.create({ ...req.body, createdBy: req.user._id });
    await task.populate('assignedTo', 'name avatar');
    res.status(201).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create task' });
  }
});

// Update task status
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('assignedTo', 'name avatar');
    res.status(200).json({ success: true, task });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update task' });
  }
});

// Delete task
router.delete('/:id', protect, async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete task' });
  }
});

module.exports = router;