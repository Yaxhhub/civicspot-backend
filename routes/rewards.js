const express = require('express');
const Reward = require('../models/Reward');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user rewards
router.get('/my-rewards', auth, async (req, res) => {
  try {
    const reward = await Reward.findOne({ user: req.user._id });
    res.json({ 
      points: req.user.points,
      activities: reward?.activities || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const topUsers = await User.find({ isAdmin: false })
      .select('name points')
      .sort({ points: -1 })
      .limit(10);
    res.json(topUsers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;