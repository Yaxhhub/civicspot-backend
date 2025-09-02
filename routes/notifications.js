const express = require('express');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get user notifications
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipients: req.user._id },
        { isGlobal: true }
      ]
    })
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 })
    .limit(20);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (!notification.readBy.includes(req.user._id)) {
      notification.readBy.push(req.user._id);
      await notification.save();
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get unread count
router.get('/unread-count', auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      $or: [
        { recipients: req.user._id },
        { isGlobal: true }
      ],
      readBy: { $ne: req.user._id }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Create notification
router.post('/admin/create', adminAuth, async (req, res) => {
  try {
    const { title, message, type, isGlobal, userIds } = req.body;

    const notification = new Notification({
      title,
      message,
      type,
      isGlobal,
      recipients: isGlobal ? [] : userIds,
      createdBy: req.user._id
    });

    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Admin: Get all notifications
router.get('/admin/all', adminAuth, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('createdBy', 'name')
      .populate('recipients', 'name email')
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;