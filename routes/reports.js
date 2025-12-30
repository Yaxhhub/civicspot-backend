const express = require('express');
const Report = require('../models/Report');
const { auth } = require('../middleware/auth');
const { cloudinary, upload } = require('../config/cloudinary');
const { assignDepartment, getPriority } = require('../utils/departmentRouter');
const { awardPoints } = require('../utils/rewardSystem');
const visionService = require('../utils/visionService');

const router = express.Router();

// Create report
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    const { title, description, type, customType, latitude, longitude, address } = req.body;
    
    let imageUrl = '';
    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        {
          folder: 'civicspot/reports',
          quality: 'auto:good',
          fetch_format: 'auto'
        }
      );
      imageUrl = result.secure_url;
    }

    const assignedDepartment = await assignDepartment(type);
    const priority = getPriority(type);

    // AI Image Analysis
    let aiAnalysis = null;
    if (imageUrl) {
      try {
        const analysis = await visionService.analyzeImage(imageUrl);
        aiAnalysis = {
          labels: analysis.labels,
          detectedIssueType: analysis.issueType,
          suggestedSeverity: analysis.severity
        };
      } catch (error) {
        console.log('AI analysis failed:', error.message);
      }
    }

    const report = new Report({
      title,
      description,
      type,
      customType: type === 'other' ? customType : undefined,
      location: { latitude: parseFloat(latitude), longitude: parseFloat(longitude), address },
      image: imageUrl,
      priority,
      assignedDepartment,
      reportedBy: req.user._id,
      aiAnalysis
    });

    await report.save();
    
    // Award points for submitting report
    await awardPoints(req.user._id, 'REPORT_SUBMITTED', `Reported: ${title}`);
    
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all reports with filtering
router.get('/', async (req, res) => {
  try {
    const { status, type, priority, department } = req.query;
    let filter = { status: 'approved' };
    
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (department) filter.assignedDepartment = department;
    
    const reports = await Report.find(filter)
      .populate('reportedBy', 'name')
      .populate('assignedDepartment', 'name')
      .sort({ createdAt: -1 });
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