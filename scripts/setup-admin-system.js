const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
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

async function setupAdminSystem() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Clear existing departments and create new ones
    await Department.deleteMany({});
    const createdDepartments = await Department.insertMany(departments);
    console.log('Departments created successfully');
    
    // Create super admin if doesn't exist
    const existingSuperAdmin = await User.findOne({ 
      isAdmin: true, 
      adminType: 'super' 
    });
    
    if (!existingSuperAdmin) {
      const superAdmin = new User({
        name: 'Super Admin',
        email: 'admin@civicspot.com',
        password: 'admin123', // Change this!
        isAdmin: true,
        adminType: 'super'
      });
      
      await superAdmin.save();
      console.log('Super admin created: admin@civicspot.com / admin123');
    } else {
      console.log('Super admin already exists');
    }
    
    // Create department admins
    for (const dept of createdDepartments) {
      const existingAdmin = await User.findOne({
        isAdmin: true,
        adminType: 'department',
        department: dept._id
      });
      
      if (!existingAdmin) {
        const deptAdmin = new User({
          name: `${dept.name} Admin`,
          email: dept.contactEmail,
          password: 'admin123', // Change this!
          isAdmin: true,
          adminType: 'department',
          department: dept._id
        });
        
        await deptAdmin.save();
        console.log(`Department admin created: ${dept.contactEmail} / admin123`);
      }
    }
    
    console.log('\n=== ADMIN SYSTEM SETUP COMPLETE ===');
    console.log('Super Admin: admin@civicspot.com / admin123');
    console.log('Department Admins:');
    createdDepartments.forEach(dept => {
      console.log(`- ${dept.name}: ${dept.contactEmail} / admin123`);
    });
    console.log('\n⚠️  IMPORTANT: Change all default passwords!');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error setting up admin system:', error);
  }
}

setupAdminSystem();