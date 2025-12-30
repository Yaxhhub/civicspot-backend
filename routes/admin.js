const express = require('express');
const Report = require('../models/Report');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { adminAuth, superAdminAuth, departmentAdminAuth } = require('../middleware/auth');
const { awardPoints } = require('../utils/rewardSystem');


const router = express.Router();

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Admin routes working', timestamp: new Date().toISOString() });
});

// Get dashboard stats (filtered by department if department admin)
router.get('/stats', departmentAdminAuth, async (req, res) => {
  try {
    let reportFilter = {};
    
    // If department admin, only count reports for their department
    if (req.user.adminType === 'department' && req.user.department) {
      reportFilter.assignedDepartment = req.user.department._id;
    }
    
    const [totalReports, resolvedReports, activeCampaigns, totalUsers, totalPosts] = await Promise.all([
      Report.countDocuments(reportFilter),
      Report.countDocuments({ ...reportFilter, status: 'resolved' }),
      Campaign.countDocuments({ date: { $gte: new Date() } }),
      User.countDocuments({ isAdmin: false }),
      Post.countDocuments()
    ]);

    res.json({
      totalReports,
      resolvedReports,
      activeCampaigns,
      totalUsers,
      totalPosts,
      department: req.user.department?.name || 'All Departments'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics data
router.get('/analytics', departmentAdminAuth, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // User engagement metrics
    const totalLikes = await Post.aggregate([
      { $project: { likesCount: { $size: '$likes' } } },
      { $group: { _id: null, total: { $sum: '$likesCount' } } }
    ]);

    const totalComments = await Post.aggregate([
      { $project: { commentsCount: { $size: '$comments' } } },
      { $group: { _id: null, total: { $sum: '$commentsCount' } } }
    ]);

    // Monthly data for charts
    const monthlyReports = await Report.aggregate([
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    const monthlyPosts = await Post.aggregate([
      {
        $group: {
          _id: { 
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 }
    ]);

    // Recent activity
    const recentUsers = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo },
      isAdmin: false 
    });

    const recentReports = await Report.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    const recentPosts = await Post.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    // Top users by activity
    const topUsers = await Post.aggregate([
      {
        $group: {
          _id: '$user',
          postCount: { $sum: 1 },
          totalLikes: { $sum: { $size: '$likes' } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo'
        }
      },
      { $unwind: '$userInfo' },
      {
        $project: {
          name: '$userInfo.name',
          email: '$userInfo.email',
          postCount: 1,
          totalLikes: 1
        }
      },
      { $sort: { postCount: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      engagement: {
        totalLikes: totalLikes[0]?.total || 0,
        totalComments: totalComments[0]?.total || 0,
        recentUsers,
        recentReports,
        recentPosts
      },
      charts: {
        monthlyReports: monthlyReports.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          reports: item.count
        })),
        monthlyPosts: monthlyPosts.map(item => ({
          month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
          posts: item.count
        }))
      },
      topUsers
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get reports for admin (filtered by department if department admin)
router.get('/reports', departmentAdminAuth, async (req, res) => {
  try {
    let filter = {};
    
    // If department admin, only show reports for their department
    if (req.user.adminType === 'department' && req.user.department) {
      filter.assignedDepartment = req.user.department._id;
    }
    
    const reports = await Report.find(filter)
      .populate('reportedBy', 'name email')
      .populate('assignedDepartment', 'name');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update report status (check department access)
router.patch('/reports/:id/status', departmentAdminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Find the report first
    const report = await Report.findById(req.params.id).populate('assignedDepartment');
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Check if department admin has access to this report
    if (req.user.adminType === 'department' && 
        req.user.department && 
        report.assignedDepartment?._id.toString() !== req.user.department._id.toString()) {
      return res.status(403).json({ message: 'Access denied: Report not in your department' });
    }
    
    report.status = status;
    await report.save();
    await report.populate('reportedBy', 'name');
    
    // Award bonus points when report gets approved
    if (status === 'approved' && report.reportedBy) {
      await awardPoints(report.reportedBy._id, 'REPORT_APPROVED', `Report approved: ${report.title}`);
    }
    
    // Send notification to user
    if (report.reportedBy) {
      await new Notification({
        title: 'Report Status Updated',
        message: `Your report "${report.title}" has been ${status}.`,
        type: 'report_update',
        recipients: [report.reportedBy._id],
        createdBy: req.user._id
      }).save();
      

    }
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all campaigns for admin (featured first)
router.get('/campaigns', departmentAdminAuth, async (req, res) => {
  try {
    const campaigns = await Campaign.find()
      .populate('createdBy', 'name email')
      .populate('participants', 'name')
      .sort({ isFeatured: -1, createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all departments
router.get('/departments', departmentAdminAuth, async (req, res) => {
  try {
    const Department = require('../models/Department');
    const departments = await Department.find();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle campaign featured status
router.patch('/campaigns/:id/toggle-feature', departmentAdminAuth, async (req, res) => {
  try {
    console.log('Toggle feature route hit for campaign ID:', req.params.id);
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      console.log('Campaign not found:', req.params.id);
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    console.log('Current featured status:', campaign.isFeatured);
    campaign.isFeatured = !campaign.isFeatured;
    await campaign.save();
    console.log('New featured status:', campaign.isFeatured);
    
    await campaign.populate('createdBy', 'name email');
    await campaign.populate('participants', 'name');
    
    res.json({ 
      message: `Campaign ${campaign.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      campaign 
    });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Feature/unfeature campaign (explicit)
router.patch('/campaigns/:id/feature', departmentAdminAuth, async (req, res) => {
  try {
    const { isFeatured } = req.body;
    
    if (typeof isFeatured !== 'boolean') {
      return res.status(400).json({ message: 'isFeatured must be a boolean value' });
    }
    
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    campaign.isFeatured = isFeatured;
    await campaign.save();
    
    await campaign.populate('createdBy', 'name email');
    await campaign.populate('participants', 'name');
    
    res.json({ 
      message: `Campaign ${isFeatured ? 'featured' : 'unfeatured'} successfully`,
      campaign 
    });
  } catch (error) {
    console.error('Feature campaign error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get all users (super admin only)
router.get('/users', superAdminAuth, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get department admins (super admin only)
router.get('/department-admins', superAdminAuth, async (req, res) => {
  try {
    const admins = await User.find({ 
      isAdmin: true, 
      adminType: 'department' 
    }).populate('department').select('-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create department admin (super admin only)
router.post('/create-department-admin', superAdminAuth, async (req, res) => {
  try {
    const { name, email, password, departmentId } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const user = new User({
      name,
      email,
      password,
      isAdmin: true,
      adminType: 'department',
      department: departmentId
    });
    
    await user.save();
    await user.populate('department');
    
    res.status(201).json({ 
      message: 'Department admin created successfully',
      admin: { ...user.toObject(), password: undefined }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle user status
router.patch('/users/:id/toggle-status', superAdminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isActive = !user.isActive;
    await user.save();
    res.json({ message: 'User status updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all posts for moderation
router.get('/posts', departmentAdminAuth, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name email')
      .populate('campaign', 'title')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});



// Delete post (admin)
router.delete('/posts/:id', departmentAdminAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete report (admin)
router.delete('/reports/:id', departmentAdminAuth, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user points (admin)
router.patch('/users/:id/points', superAdminAuth, async (req, res) => {
  try {
    const { points } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { points }, { new: true });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// NOTIFICATION MANAGEMENT
// Get all notifications for admin
router.get('/notifications', departmentAdminAuth, async (req, res) => {
  try {
    const notifications = await Notification.find()
      .populate('createdBy', 'name')
      .populate('recipients', 'name email')
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create notification
router.post('/notifications', departmentAdminAuth, async (req, res) => {
  try {
    const { title, message, type, isGlobal, userIds } = req.body;
    const notification = new Notification({
      title,
      message,
      type,
      isGlobal,
      recipients: isGlobal ? [] : userIds,
      createdBy: req.user._id
    });
    await notification.save();
    res.status(201).json(notification);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete notification
router.delete('/notifications/:id', departmentAdminAuth, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// REWARD MANAGEMENT
// Get rewards overview
router.get('/rewards', departmentAdminAuth, async (req, res) => {
  try {
    const Reward = require('../models/Reward');
    
    // Get all users with points
    const allUsers = await User.find({ isAdmin: false })
      .select('name email points createdAt')
      .sort({ points: -1 });
    
    // Get top users
    const topUsers = allUsers.slice(0, 20);
    
    const totalPointsAwarded = await User.aggregate([
      { $match: { isAdmin: false } },
      { $group: { _id: null, total: { $sum: '$points' } } }
    ]);
    
    const recentActivities = await Reward.find()
      .populate('user', 'name email')
      .sort({ updatedAt: -1 })
      .limit(10);
    
    res.json({
      allUsers,
      topUsers,
      totalPointsAwarded: totalPointsAwarded[0]?.total || 0,
      recentActivities
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Award points to user
router.post('/users/:id/award-points', departmentAdminAuth, async (req, res) => {
  try {
    const { points, description } = req.body;
    
    if (!points || points <= 0) {
      return res.status(400).json({ message: 'Valid points amount required' });
    }
    
    await awardPoints(req.params.id, 'ADMIN_AWARD', description || 'Admin awarded points', points);
    
    const user = await User.findById(req.params.id).select('name points');
    res.json({ message: 'Points awarded successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// MODERATION FEATURES
// Get flagged content
router.get('/moderation/flagged', departmentAdminAuth, async (req, res) => {
  try {
    const flaggedPosts = await Post.find({ isFlagged: true })
      .populate('user', 'name email')
      .populate('campaign', 'title')
      .sort({ createdAt: -1 });
    
    const flaggedReports = await Report.find({ isFlagged: true })
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({ posts: flaggedPosts, reports: flaggedReports });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Flag/unflag content
router.patch('/moderation/:type/:id/flag', departmentAdminAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { isFlagged } = req.body;
    
    let item;
    if (type === 'post') {
      item = await Post.findByIdAndUpdate(id, { isFlagged }, { new: true });
    } else if (type === 'report') {
      item = await Report.findByIdAndUpdate(id, { isFlagged }, { new: true });
    }
    
    res.json({ message: `${type} ${isFlagged ? 'flagged' : 'unflagged'} successfully`, item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get moderation stats
router.get('/moderation/stats', departmentAdminAuth, async (req, res) => {
  try {
    const flaggedPostsCount = await Post.countDocuments({ isFlagged: true });
    const flaggedReportsCount = await Report.countDocuments({ isFlagged: true });
    const totalPostsCount = await Post.countDocuments();
    const totalReportsCount = await Report.countDocuments();
    
    res.json({
      flaggedPosts: flaggedPostsCount,
      flaggedReports: flaggedReportsCount,
      totalPosts: totalPostsCount,
      totalReports: totalReportsCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;