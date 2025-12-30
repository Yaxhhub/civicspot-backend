const vision = require('@google-cloud/vision');

class VisionService {
  constructor() {
    this.client = new vision.ImageAnnotatorClient({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE
    });
  }

  async analyzeImage(imageUrl) {
    try {
      const [result] = await this.client.labelDetection(imageUrl);
      const labels = result.labelAnnotations;
      
      return {
        labels: labels.map(label => ({
          description: label.description,
          score: label.score,
          confidence: Math.round(label.score * 100)
        })),
        issueType: this.classifyIssueType(labels),
        severity: this.assessSeverity(labels)
      };
    } catch (error) {
      console.error('Vision API Error:', error);
      throw new Error('Image analysis failed');
    }
  }

  classifyIssueType(labels) {
    const issueKeywords = {
      'pothole': ['road', 'asphalt', 'crack', 'hole', 'pavement'],
      'graffiti': ['wall', 'paint', 'graffiti', 'vandalism'],
      'streetlight': ['light', 'lamp', 'pole', 'street light'],
      'garbage': ['trash', 'garbage', 'waste', 'litter'],
      'broken_sign': ['sign', 'signage', 'traffic sign'],
      'water_leak': ['water', 'pipe', 'leak', 'flooding']
    };

    const labelTexts = labels.map(l => l.description.toLowerCase());
    
    for (const [issueType, keywords] of Object.entries(issueKeywords)) {
      if (keywords.some(keyword => 
        labelTexts.some(label => label.includes(keyword))
      )) {
        return issueType;
      }
    }
    
    return 'other';
  }

  assessSeverity(labels) {
    const severityKeywords = {
      'high': ['broken', 'damaged', 'dangerous', 'hazard'],
      'medium': ['worn', 'old', 'faded'],
      'low': ['minor', 'small']
    };

    const labelTexts = labels.map(l => l.description.toLowerCase());
    
    for (const [severity, keywords] of Object.entries(severityKeywords)) {
      if (keywords.some(keyword => 
        labelTexts.some(label => label.includes(keyword))
      )) {
        return severity;
      }
    }
    
    return 'medium';
  }
}

module.exports = new VisionService();