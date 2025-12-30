const mongoose = require('mongoose');
require('dotenv').config();

const Department = require('../models/Department');

const departments = [
  {
    name: 'Public Works',
    description: 'Handles roads, sidewalks, street lights, and general infrastructure',
    issueTypes: ['pothole', 'streetlight', 'drainage', 'graffiti', 'sidewalk'],
    contactEmail: 'publicworks@city.gov',
    isActive: true
  },
  {
    name: 'Sanitation',
    description: 'Manages waste collection and cleanup services',
    issueTypes: ['garbage'],
    contactEmail: 'sanitation@city.gov',
    isActive: true
  },
  {
    name: 'Traffic Management',
    description: 'Handles traffic signals and road safety issues',
    issueTypes: ['traffic'],
    contactEmail: 'traffic@city.gov',
    isActive: true
  },
  {
    name: 'Parks & Recreation',
    description: 'Maintains parks and recreational facilities',
    issueTypes: ['park'],
    contactEmail: 'parks@city.gov',
    isActive: true
  },
  {
    name: 'Code Enforcement',
    description: 'Handles noise complaints and code violations',
    issueTypes: ['noise'],
    contactEmail: 'codeenforcement@city.gov',
    isActive: true
  },
  {
    name: 'Water Department',
    description: 'Manages water infrastructure and leaks',
    issueTypes: ['water'],
    contactEmail: 'water@city.gov',
    isActive: true
  }
];

async function seedDepartments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    await Department.deleteMany({});
    await Department.insertMany(departments);
    
    console.log('Departments seeded successfully');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding departments:', error);
  }
}

seedDepartments();