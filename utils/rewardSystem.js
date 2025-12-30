const User = require('../models/User');
const Reward = require('../models/Reward');

const POINT_VALUES = {
  REPORT_SUBMITTED: 10,
  REPORT_APPROVED: 20
};

const awardPoints = async (userId, activityType, description = '', customPoints = null) => {
  try {
    const points = customPoints || POINT_VALUES[activityType] || 0;
    
    // Update user points
    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');
    
    user.points += points;
    await user.save();
    
    // Create/update reward record
    let reward = await Reward.findOne({ user: userId });
    if (!reward) {
      reward = new Reward({ user: userId, activities: [] });
    }
    
    reward.activities.push({
      type: activityType,
      points,
      description
    });
    
    await reward.save();
    return { points, newTotal: user.points };
  } catch (error) {
    console.error('Error awarding points:', error);
    throw error;
  }
};

module.exports = { awardPoints };