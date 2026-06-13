const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth.middleware');
const { generateMeetingSummary, transcribeAudio } = require('../services/ai.service');
const Meeting = require('../models/Meeting.model');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/summarize/:meetingCode', protect, async (req, res) => {
  try {
    const { transcript } = req.body;
    const meeting = await Meeting.findOne({ meetingCode: req.params.meetingCode });
    if (!meeting) return res.status(404).json({ success: false, message: 'Meeting not found' });
    const aiResult = await generateMeetingSummary(transcript || meeting.transcript || '', meeting.title);
    meeting.transcript = transcript || meeting.transcript;
    meeting.summary = aiResult.summary;
    meeting.actionItems = aiResult.actionItems.map(item => ({ text: item.text, status: 'pending' }));
    await meeting.save();
    res.status(200).json({ success: true, result: aiResult });
  } catch (error) {
    console.error('AI summarize error:', error);
    res.status(500).json({ success: false, message: 'AI processing failed' });
  }
});

router.post('/transcribe', protect, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No audio file provided' });
    const text = await transcribeAudio(req.file.buffer, req.file.originalname || 'audio.webm');
    res.status(200).json({ success: true, text });
  } catch (error) {
    console.error('Transcribe error:', error);
    res.status(500).json({ success: false, message: 'Transcription failed' });
  }
});

module.exports = router;