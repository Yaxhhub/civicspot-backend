const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Department = require('../models/Department');

async function showAdminInfo() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB\n');
    
    // Get all departments with their IDs
    const departments = await Department.find().sort({ name: 1 });
    console.log('=== DEPARTMENTS ===');
    departments.forEach(dept => {
      console.log(`ID: ${dept._id}`);
      console.log(`Name: ${dept.name}`);
      console.log(`Email: ${dept.contactEmail}`);
      console.log(`Issue Types: ${dept.issueTypes.join(', ')}`);
      console.log('---');
    });
    
    // Get super admin
    const superAdmin = await User.findOne({ 
      isAdmin: true, 
      adminType: 'super' 
    });
    
    console.log('\n=== SUPER ADMIN ===');
    if (superAdmin) {
      console.log(`ID: ${superAdmin._id}`);
      console.log(`Name: ${superAdmin.name}`);
      console.log(`Email: ${superAdmin.email}`);
      console.log(`Password: admin123 (default)`);
    } else {
      console.log('No super admin found');
    }
    
    // Get department admins
    const departmentAdmins = await User.find({ 
      isAdmin: true, 
      adminType: 'department' 
    }).populate('department', 'name');
    
    console.log('\n=== DEPARTMENT ADMINS ===');
    departmentAdmins.forEach(admin => {
      console.log(`ID: ${admin._id}`);
      console.log(`Name: ${admin.name}`);
      console.log(`Email: ${admin.email}`);
      console.log(`Department: ${admin.department?.name || 'None'}`);
      console.log(`Department ID: ${admin.department?._id || 'None'}`);
      console.log(`Password: admin123 (default)`);
      console.log('---');
    });
    
    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Super Admin Panel: admin@civicspot.com / admin123');
    console.log('\nDepartment Admin Panels:');
    departmentAdmins.forEach(admin => {
      console.log(`${admin.department?.name}: ${admin.email} / admin123`);
    });
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

showAdminInfo();