const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth.middleware');
const multer = require('multer');
const cloudinary = require('../config/cloudinary.config');
const Task = require('../models/Task.model');
const Meeting = require('../models/Meeting.model');
const { createMeeting, getMeetings, getMeetingByCode, startMeeting, endMeeting, saveSummary, deleteMeeting } = require('../controllers/meeting.controller');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

router.post('/', protect, createMeeting);
router.get('/', protect, getMeetings);
router.get('/:code', protect, getMeetingByCode);
router.put('/:code/start', protect, startMeeting);
router.put('/:code/end', protect, endMeeting);
router.put('/:code/summary', protect, saveSummary);
router.delete('/:id', protect, deleteMeeting);

router.post('/:code/recording', protect, upload.single('recording'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No recording file' });
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'intellmeet/recordings' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });
    await Meeting.findOneAndUpdate({ meetingCode: req.params.code }, { isRecorded: true, recordingUrl: result.secure_url });
    res.status(200).json({ success: true, recordingUrl: result.secure_url });
  } catch (error) {
    console.error('Recording upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload recording' });
  }
});

router.post('/:code/convert-actions', protect, async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingCode: req.params.code });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    
    // Only convert if there are action items
    if (!meeting.actionItems || meeting.actionItems.length === 0) {
      return res.status(400).json({ success: false, message: 'No action items found' });
    }

    const tasks = await Promise.all(
      meeting.actionItems
        .filter(item => item.status === 'pending')
        .map(item => Task.create({
          title: item.text,
          status: 'todo',
          priority: 'medium',
          createdBy: req.user._id,
          assignedTo: item.assignedTo || req.user._id,
          meeting: meeting._id,
        }))
    );
    res.status(201).json({ success: true, tasks });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to convert action items' });
  }
});

module.exports = router;