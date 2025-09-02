const express = require('express');
const Report = require('../models/Report');
const { auth } = require('../middleware/auth');
const { cloudinary, upload } = require('../config/cloudinary');

const router = express.Router();

// Create report
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, type, latitude, longitude, address } = req.body;
    
    let imageUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(
        { resource_type: 'image', folder: 'civicspot/reports' },
        (error, result) => {
          if (error) throw error;
          return result;
        }
      );
      
      const uploadPromise = new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: 'image', folder: 'civicspot/reports' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
      
      const uploadResult = await uploadPromise;
      imageUrl = uploadResult.secure_url;
    }

    const report = new Report({
      title,
      description,
      type,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address },
      image: imageUrl,
      reportedBy: req.user._id
    });

    await report.save();
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all reports
router.get('/', async (req, res) => {
  try {
    const reports = await Report.find({ status: 'approved' }).populate('reportedBy', 'name');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user reports
router.get('/my-reports', auth, async (req, res) => {
  try {
    const reports = await Report.find({ reportedBy: req.user._id });
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;