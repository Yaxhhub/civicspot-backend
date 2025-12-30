const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select('-password').populate('department');
  if (!user || !user.isActive) throw new Error('Invalid token');
  return user;
};

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    req.user = await authenticateUser(token);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const user = await authenticateUser(token);
    if (!user.isAdmin) return res.status(403).json({ message: 'Admin access required' });
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const superAdminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const user = await authenticateUser(token);
    if (!user.isAdmin || user.adminType !== 'super') {
      return res.status(403).json({ message: 'Super admin access required' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const departmentAdminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });

    const user = await authenticateUser(token);
    if (!user.isAdmin || (user.adminType !== 'super' && user.adminType !== 'department')) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { auth, adminAuth, superAdminAuth, departmentAdminAuth };