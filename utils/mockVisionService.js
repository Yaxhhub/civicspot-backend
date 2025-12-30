// Mock AI service for development (no billing required)
class MockVisionService {
  async analyzeImage(imageUrl) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock analysis based on common civic issues
    const mockAnalyses = [
      {
        labels: [
          { description: 'Road', confidence: 95 },
          { description: 'Asphalt', confidence: 87 },
          { description: 'Crack', confidence: 78 }
        ],
        issueType: 'pothole',
        severity: 'high'
      },
      {
        labels: [
          { description: 'Wall', confidence: 92 },
          { description: 'Paint', confidence: 85 },
          { description: 'Graffiti', confidence: 89 }
        ],
        issueType: 'graffiti',
        severity: 'medium'
      },
      {
        labels: [
          { description: 'Trash', confidence: 94 },
          { description: 'Garbage', confidence: 88 },
          { description: 'Waste', confidence: 82 }
        ],
        issueType: 'garbage',
        severity: 'medium'
      },
      {
        labels: [
          { description: 'Light', confidence: 91 },
          { description: 'Pole', confidence: 86 },
          { description: 'Street light', confidence: 79 }
        ],
        issueType: 'streetlight',
        severity: 'high'
      }
    ];
    
    // Return random analysis
    const randomAnalysis = mockAnalyses[Math.floor(Math.random() * mockAnalyses.length)];
    
    return {
      labels: randomAnalysis.labels.map(label => ({
        description: label.description,
        score: label.confidence / 100,
        confidence: label.confidence
      })),
      issueType: randomAnalysis.issueType,
      severity: randomAnalysis.severity
    };
  }
}

module.exports = new MockVisionService();