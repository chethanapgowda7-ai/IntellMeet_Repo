const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth.middleware');
const User = require('../models/User.model');
const cloudinary = require('../config/cloudinary.config');
const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('team');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name }, { new: true, runValidators: true });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.put('/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    const user = await User.findById(req.user._id);
    if (user.avatarPublicId) {
      try { await cloudinary.uploader.destroy(user.avatarPublicId); } catch(e) {}
    }
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'intellmeet/avatars', transformation: [{ width: 200, height: 200, crop: 'fill' }] },
        (error, result) => { if (error) reject(error); else resolve(result); }
      );
      stream.end(req.file.buffer);
    });
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: result.secure_url, avatarPublicId: result.public_id },
      { new: true }
    );
    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

router.put('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Both passwords required' });
    if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) return res.status(400).json({ success: false, message: 'Cannot change password for Google accounts' });
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update password' });
  }
});

router.put('/notifications', protect, async (req, res) => {
  try {
    const { notificationPrefs } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { notificationPrefs }, { new: true });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update notification preferences' });
  }
});

router.get('/all', protect, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const users = await User.find().select('name email avatar role isOnline createdAt team').populate('team', 'name').skip((page-1)*limit).limit(limit);
    const total = await User.countDocuments();
    res.status(200).json({ success: true, users, total, pages: Math.ceil(total/limit) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

router.put('/:id/role', protect, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) return res.status(400).json({ success: false, message: 'Invalid role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true });
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    const { search } = req.query;
    const query = search ? { email: { $regex: search, $options: 'i' } } : {};
    const users = await User.find(query).select('name email avatar isOnline role').limit(20);
    res.status(200).json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

module.exports = router;