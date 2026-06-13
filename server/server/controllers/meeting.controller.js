const Meeting = require('../models/Meeting.model');
const { v4: uuidv4 } = require('uuid');

// Generate unique meeting code
const generateMeetingCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 2) code += '-';
  }
  return code; // e.g., ABC-DEF-GHI
};

// @desc    Create a new meeting
// @route   POST /api/meetings
const createMeeting = async (req, res) => {
  try {
    const { title, description, scheduledAt, teamId } = req.body;

    const meetingCode = generateMeetingCode();

    const meeting = await Meeting.create({
      title,
      description,
      meetingCode,
      host: req.user._id,
      participants: [{ user: req.user._id, role: 'host' }],
      scheduledAt,
      team: teamId,
      status: 'scheduled',
    });

    await meeting.populate('host', 'name email avatar');

    res.status(201).json({ success: true, meeting });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ success: false, message: 'Failed to create meeting' });
  }
};

// @desc    Get all meetings for user
// @route   GET /api/meetings
const getMeetings = async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [
        { host: req.user._id },
        { 'participants.user': req.user._id },
      ],
    })
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar')
      .sort({ createdAt: -1 });

    console.log(`GET /meetings by user ${req.user._id} (${req.user.email}). Found ${meetings.length} meetings.`);
    res.status(200).json({ success: true, meetings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch meetings' });
  }
};

// @desc    Get single meeting by code
// @route   GET /api/meetings/:code
const getMeetingByCode = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingCode: req.params.code })
      .populate('host', 'name email avatar')
      .populate('participants.user', 'name email avatar');

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch meeting' });
  }
};

// @desc    Start a meeting
// @route   PUT /api/meetings/:code/start
const startMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingCode: req.params.code });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can start the meeting' });
    }

    meeting.status = 'active';
    meeting.startTime = new Date();
    await meeting.save();

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to start meeting' });
  }
};

// @desc    End a meeting
// @route   PUT /api/meetings/:code/end
const endMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ meetingCode: req.params.code });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can end the meeting' });
    }

    meeting.status = 'ended';
    meeting.endTime = new Date();
    if (meeting.startTime) {
      meeting.duration = Math.round((meeting.endTime - meeting.startTime) / 60000);
    }
    await meeting.save();

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to end meeting' });
  }
};

// @desc    Save AI summary and action items
// @route   PUT /api/meetings/:code/summary
const saveSummary = async (req, res) => {
  try {
    const { summary, actionItems, transcript } = req.body;
    const meeting = await Meeting.findOne({ meetingCode: req.params.code });

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    meeting.summary = summary;
    meeting.transcript = transcript;
    meeting.actionItems = actionItems || [];
    await meeting.save();

    res.status(200).json({ success: true, meeting });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to save summary' });
  }
};

// @desc    Delete a meeting
// @route   DELETE /api/meetings/:id
const deleteMeeting = async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) {
      return res.status(404).json({ success: false, message: 'Meeting not found' });
    }

    if (meeting.host.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only host can delete the meeting' });
    }

    await meeting.deleteOne();
    res.status(200).json({ success: true, message: 'Meeting deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete meeting' });
  }
};

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingByCode,
  startMeeting,
  endMeeting,
  saveSummary,
  deleteMeeting,
};