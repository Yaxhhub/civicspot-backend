const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: false, default: '' },
  type: { type: String, enum: ['pothole', 'garbage', 'streetlight', 'drainage', 'graffiti', 'traffic', 'sidewalk', 'park', 'noise', 'water', 'other'], required: true },
  customType: { type: String, required: false },
  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    address: String
  },
  image: { type: String, required: false },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  assignedDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isFlagged: { type: Boolean, default: false },
  aiAnalysis: {
    labels: [{
      description: String,
      confidence: Number
    }],
    detectedIssueType: String,
    suggestedSeverity: String,
    analysisDate: { type: Date, default: Date.now }
  }
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);