const express = require('express');
const Campaign = require('../models/Campaign');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Create campaign
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, latitude, longitude, address, date } = req.body;
    
    const campaign = new Campaign({
      title,
      description,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address },
      date: new Date(date),
      createdBy: req.user._id
    });

    await campaign.save();
    res.status(201).json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaign.find().populate('createdBy', 'name').populate('participants', 'name');
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Join campaign
router.post('/:id/join', auth, async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    if (!campaign.participants.includes(req.user._id)) {
      campaign.participants.push(req.user._id);
      await campaign.save();
    }

    res.json({ message: 'Joined campaign successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;