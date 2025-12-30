const Department = require('../models/Department');

const departmentMapping = {
  'pothole': 'Public Works',
  'garbage': 'Sanitation',
  'streetlight': 'Public Works', 
  'drainage': 'Public Works',
  'graffiti': 'Public Works',
  'traffic': 'Traffic Management',
  'sidewalk': 'Public Works',
  'park': 'Parks & Recreation',
  'noise': 'Code Enforcement',
  'water': 'Water Department'
};

const assignDepartment = async (reportType) => {
  try {
    const departmentName = departmentMapping[reportType] || 'General Services';
    const department = await Department.findOne({ name: departmentName, isActive: true });
    return department ? department._id : null;
  } catch (error) {
    console.error('Error assigning department:', error);
    return null;
  }
};

const getPriority = (reportType) => {
  const highPriority = ['water', 'traffic', 'streetlight'];
  const urgentPriority = ['drainage'];
  
  if (urgentPriority.includes(reportType)) return 'urgent';
  if (highPriority.includes(reportType)) return 'high';
  return 'medium';
};

module.exports = { assignDepartment, getPriority };