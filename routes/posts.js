const express = require('express');
const multer = require('multer');
const { cloudinary } = require('../config/cloudinary');
const Post = require('../models/Post');
const { auth } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all posts
router.get('/', async (req, res) => {
  try {
    console.log('Fetching posts from database...');
    const posts = await Post.find()
      .populate('user', 'name')
      .populate('campaign', 'title')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
    console.log(`Found ${posts.length} posts`);
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Posts route working' });
});

// Create post with image upload
router.post('/', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('POST /api/posts - Body:', req.body);
    console.log('POST /api/posts - File:', req.file);
    
    const { caption, campaignId } = req.body;
    
    if (!caption) {
      return res.status(400).json({ message: 'Caption is required' });
    }
    
    let imageUrl = 'https://picsum.photos/400/300?random=1';
    
    if (req.file) {
      try {
        console.log('Uploading file to cloudinary, size:', req.file.size);
        const result = await cloudinary.uploader.upload(
          `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
          {
            quality: 'auto:good',
            fetch_format: 'auto',
            width: 800,
            height: 600,
            crop: 'limit'
          }
        );
        imageUrl = result.secure_url;
        console.log('Cloudinary upload successful:', imageUrl);
      } catch (cloudinaryError) {
        console.error('Cloudinary error:', cloudinaryError);
        // Continue with placeholder image if upload fails
      }
    } else {
      console.log('No file received in request');
    }
    
    console.log('Final image URL:', imageUrl);

    const postData = {
      user: req.user._id,
      campaign: campaignId || null,
      image: imageUrl,
      caption
    };
    
    console.log('Creating post with data:', postData);
    const post = new Post(postData);
    console.log('Post before save:', post.toObject());
    
    await post.save();
    console.log('Post after save:', post.toObject());
    
    await post.populate('user', 'name');
    if (campaignId) {
      await post.populate('campaign', 'title');
    }
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Like/unlike post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isLiked = post.likes.includes(req.user._id);
    
    if (isLiked) {
      post.likes = post.likes.filter(id => !id.equals(req.user._id));
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();
    res.json({ liked: !isLiked, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add comment
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({
      user: req.user._id,
      text
    });

    await post.save();
    await post.populate('comments.user', 'name');
    
    res.json(post.comments[post.comments.length - 1]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's posts
router.get('/my-posts', auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.user._id })
      .populate('user', 'name')
      .populate('campaign', 'title')
      .populate('comments.user', 'name')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete post
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    
    if (post.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;