const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date },
  role: {
    type: String,
    enum: ['host', 'participant'],
    default: 'participant',
  },
  isMuted: { type: Boolean, default: false },
  isCameraOff: { type: Boolean, default: false },
});

const actionItemSchema = new mongoose.Schema({
  text: { type: String, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dueDate: { type: Date },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending',
  },
});

const meetingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Meeting title is required'],
    trim: true,
  },
  description: { type: String, trim: true },
  meetingCode: {
    type: String,
    unique: true,
    required: true,
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  participants: [participantSchema],
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended'],
    default: 'scheduled',
  },
  startTime: { type: Date },
  endTime: { type: Date },
  scheduledAt: { type: Date },
  duration: { type: Number, default: 0 }, // in minutes
  isRecorded: { type: Boolean, default: false },
  recordingUrl: { type: String },
  transcript: { type: String, default: '' },
  summary: { type: String, default: '' },
  actionItems: [actionItemSchema],
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
  },
  isPasswordProtected: { type: Boolean, default: false },
  password: { type: String, select: false },
}, { timestamps: true });

module.exports = mongoose.model('Meeting', meetingSchema);