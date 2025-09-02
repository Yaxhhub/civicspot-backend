const express = require('express');
const Report = require('../models/Report');
const Campaign = require('../models/Campaign');
const User = require('../models/User');
const Post = require('../models/Post');
const Notification = require('../models/Notification');
const { adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const totalReports = await Report.countDocuments();
    const resolvedReports = await Report.countDocuments({ status: 'resolved' });
    const activeCampaigns = await Campaign.countDocuments({ date: { $gte: new Date() } });
    const totalUsers = await User.countDocuments({ isAdmin: false });
    const totalPosts = await Post.countDocuments();
    const pendingPosts = await Post.countDocuments({ status: 'pending' });

    res.json({
      totalReports,
      resolvedReports,
      activeCampaigns,
      totalUsers,
      totalPosts,
      pendingPosts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get analytics data
router.get('/analytics', adminAuth, async (req, res) => {
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

// Get all reports for admin
router.get('/reports', adminAuth, async (req, res) => {
  try {
    const reports = await Report.find().populate('reportedBy', 'name email');
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update report status
router.patch('/reports/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const report = await Report.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate('reportedBy', 'name');
    
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

// Get all campaigns for admin
router.get('/campaigns', adminAuth, async (req, res) => {
  try {
    const campaigns = await Campaign.find().populate('createdBy', 'name email').populate('participants', 'name');
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Feature campaign
router.patch('/campaigns/:id/feature', adminAuth, async (req, res) => {
  try {
    const { isFeatured } = req.body;
    const campaign = await Campaign.findByIdAndUpdate(req.params.id, { isFeatured }, { new: true });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find({ isAdmin: false }).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle user status
router.patch('/users/:id/toggle-status', adminAuth, async (req, res) => {
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
router.get('/posts', adminAuth, async (req, res) => {
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

// Update post status
router.patch('/posts/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('user', 'name email');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete post (admin)
router.delete('/posts/:id', adminAuth, async (req, res) => {
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

module.exports = router;