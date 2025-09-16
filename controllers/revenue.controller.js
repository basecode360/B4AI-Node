// =============================================
// 📁 controllers/revenueController.js (COMPLETE WITH DETAILED LOGGING)
// =============================================

import { userModel } from '../models/userModel.js';

// 📊 Get comprehensive revenue analytics (FIXED REVENUE CALCULATION)
export const getRevenueAnalytics = async (req, res) => {
  try {
    // Get all users with subscription details
    const allUsers = await userModel.find({}).lean();

    if (allUsers.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users found in database',
        data: {
          totalRevenue: 0,
          thisMonthRevenue: 0,
          lastMonthRevenue: 0,
          percentChange: 0,
          totalPaidUsers: 0,
          totalUsers: 0,
          averageRevenuePerUser: 0,
          conversionRate: 0,
          monthlyData: [],
          planDistribution: []
        }
      });
    }

    // Filter paid users
    const paidUsers = allUsers.filter(user => {
      const isPaid = user.hasPaid && user.subscriptionDetails;
      if (isPaid && user.subscriptionDetails) {
      }
      return isPaid;
    });


    // Calculate current month and last month dates
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // 🔥 FIXED: Initialize revenue metrics with proper calculation
    let totalRevenue = 0;
    let totalLifetimeRevenue = 0; // NEW: Separate lifetime revenue
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    
    const planDistribution = { monthly: 0, quarterly: 0 };
    const planRevenue = { monthly: 0, quarterly: 0 };


    // Process each paid user
    paidUsers.forEach((user, index) => {
      
      const subscription = user.subscriptionDetails;
      if (!subscription || !subscription.amount) {
        return;
      }

      // 🔥 FIXED: Calculate both current subscription value AND lifetime value
      const subscriptionAmount = subscription.amount;
      
      // Add current subscription amount to total revenue
      totalRevenue += subscriptionAmount;

      // Calculate lifetime value based on join date and plan (for analytics only)
      const joinDate = new Date(user.createdAt);
      const monthsSinceJoined = Math.max(1, 
        (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );


      let userLifetimeValue = 0;
      if (subscription.planType === 'monthly') {
        userLifetimeValue = subscription.amount * Math.floor(monthsSinceJoined);
        planDistribution.monthly++;
        planRevenue.monthly += subscriptionAmount; // 🔥 FIXED: Use current amount, not lifetime
      } else if (subscription.planType === 'quarterly') {
        userLifetimeValue = subscription.amount * Math.floor(monthsSinceJoined / 3);
        planDistribution.quarterly++;
        planRevenue.quarterly += subscriptionAmount; // 🔥 FIXED: Use current amount, not lifetime
      }

      totalLifetimeRevenue += userLifetimeValue;

      // Calculate this month and last month revenue (based on payment date)
      if (subscription.paymentDate) {
        const paymentDate = new Date(subscription.paymentDate);
        
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          thisMonthRevenue += subscription.amount;
        }
        if (paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear) {
          lastMonthRevenue += subscription.amount;
        }
      } else {
      }
    });

    // Calculate percentage change
    const percentChange = lastMonthRevenue === 0 ? 
      (thisMonthRevenue > 0 ? 100 : 0) : 
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    // Calculate average revenue per user (using current revenue)
    const averageRevenuePerUser = paidUsers.length > 0 ? totalRevenue / paidUsers.length : 0;


    // Generate monthly data for charts (last 7 months including current)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();


      let monthRevenue = 0;
      let monthUsers = 0;

      paidUsers.forEach(user => {
        if (user.subscriptionDetails && user.subscriptionDetails.paymentDate) {
          const paymentDate = new Date(user.subscriptionDetails.paymentDate);
          if (paymentDate.getMonth() === targetMonth && paymentDate.getFullYear() === targetYear) {
            monthRevenue += user.subscriptionDetails.amount;
            monthUsers++;
          }
        }
      });


      monthlyData.push({
        month: monthNames[targetMonth],
        revenue: monthRevenue,
        users: monthUsers
      });
    }


    // Prepare plan distribution data
    const planDistributionData = [
      {
        plan: 'Monthly',
        count: planDistribution.monthly,
        revenue: planRevenue.monthly,
        percentage: paidUsers.length > 0 ? (planDistribution.monthly / paidUsers.length) * 100 : 0
      },
      {
        plan: 'Quarterly',
        count: planDistribution.quarterly,
        revenue: planRevenue.quarterly,
        percentage: paidUsers.length > 0 ? (planDistribution.quarterly / paidUsers.length) * 100 : 0
      }
    ];


    // 🔥 FIXED: Use current revenue for main analytics, lifetime for detailed analysis
    const revenueAnalytics = {
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Current active subscriptions
      totalLifetimeRevenue: Math.round(totalLifetimeRevenue * 100) / 100, // Historical lifetime value
      thisMonthRevenue: Math.round(thisMonthRevenue * 100) / 100,
      lastMonthRevenue: Math.round(lastMonthRevenue * 100) / 100,
      percentChange: Math.round(percentChange * 100) / 100,
      totalPaidUsers: paidUsers.length,
      totalUsers: allUsers.length,
      averageRevenuePerUser: Math.round(averageRevenuePerUser * 100) / 100,
      conversionRate: allUsers.length > 0 ? Math.round((paidUsers.length / allUsers.length) * 100 * 100) / 100 : 0,
      monthlyData,
      planDistribution: planDistributionData
    };

    res.status(200).json({
      success: true,
      message: 'Revenue analytics fetched successfully',
      data: revenueAnalytics
    });

  } catch (error) {
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue analytics',
      error: error.message
    });
  }
};

// 📊 Get quick revenue summary
export const getRevenueSummary = async (req, res) => {
  try {
    const paidUsers = await userModel.find({ hasPaid: true }).lean();
    const totalUsers = await userModel.countDocuments();

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let quarterlyRevenue = 0;
    let activeSubscriptions = 0;

    const now = new Date();

    paidUsers.forEach((user, index) => {
      
      if (user.subscriptionDetails && user.subscriptionDetails.amount) {
        
        // Check if subscription is still active
        if (user.subscriptionDetails.expiryDate && new Date(user.subscriptionDetails.expiryDate) > now) {
          activeSubscriptions++;
        } else {
        }

        const joinDate = new Date(user.createdAt);
        const monthsSinceJoined = Math.max(1, 
          (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );


        let userRevenue = 0;
        if (user.subscriptionDetails.planType === 'monthly') {
          userRevenue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined);
          monthlyRevenue += userRevenue;
        } else if (user.subscriptionDetails.planType === 'quarterly') {
          userRevenue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined / 3);
          quarterlyRevenue += userRevenue;
        }
        totalRevenue += userRevenue;
      } else {
      }
    });

    const summaryData = {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
      quarterlyRevenue: Math.round(quarterlyRevenue * 100) / 100,
      totalPaidUsers: paidUsers.length,
      activeSubscriptions,
      totalUsers,
      conversionRate: totalUsers > 0 ? Math.round((paidUsers.length / totalUsers) * 100 * 100) / 100 : 0
    };

    res.status(200).json({
      success: true,
      message: 'Revenue summary fetched successfully',
      data: summaryData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue summary',
      error: error.message
    });
  }
};

// 📊 Get specific user revenue details
export const getUserRevenue = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await userModel.findById(userId).select('-password').lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let userRevenue = {
      lifetimeValue: 0,
      currentPlan: null,
      monthlyValue: 0,
      paymentHistory: [],
      nextBilling: null,
      subscriptionStatus: 'inactive',
      joinDate: user.createdAt,
      lastActive: user.lastLogin || user.lastActive
    };

    if (user.hasPaid && user.subscriptionDetails) {
      const subscription = user.subscriptionDetails;
      
      const joinDate = new Date(user.createdAt);
      const now = new Date();
      const monthsSinceJoined = Math.max(1, 
        (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      // Calculate lifetime value
      if (subscription.planType === 'monthly') {
        userRevenue.lifetimeValue = subscription.amount * Math.floor(monthsSinceJoined);
      } else if (subscription.planType === 'quarterly') {
        userRevenue.lifetimeValue = subscription.amount * Math.floor(monthsSinceJoined / 3);
      }

      userRevenue.currentPlan = subscription.planType;
      userRevenue.monthlyValue = subscription.amount;
      userRevenue.nextBilling = subscription.expiryDate;
      
      // Check if subscription is active
      if (subscription.expiryDate && new Date(subscription.expiryDate) > now) {
        userRevenue.subscriptionStatus = 'active';
      } else {
        userRevenue.subscriptionStatus = 'expired';
      }

      // Create payment history entry
      if (subscription.paymentDate) {
        const historyEntry = {
          date: subscription.paymentDate,
          amount: subscription.amount,
          planType: subscription.planType,
          currency: subscription.currency || 'USD',
          stripeSessionId: subscription.stripeSessionId
        };
        userRevenue.paymentHistory.push(historyEntry);
      } else {
      }
    } else {
    }

    const responseData = {
      user: {
        id: user._id,
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email.split('@')[0],
        role: user.role,
        isVerified: user.isVerified,
        joinDate: user.createdAt,
        isPaid: user.hasPaid,
        profile: user.profile
      },
      revenue: userRevenue
    };


    res.status(200).json({
      success: true,
      message: 'User revenue details fetched successfully',
      data: responseData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user revenue details',
      error: error.message
    });
  }
};

// 📊 Update user subscription (Admin only)
export const updateSubscription = async (req, res) => {
  try {

    const { userId, planType, amount, currency = 'USD', stripeSessionId } = req.body;

    // Validation
    if (!userId || !planType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, planType, amount'
      });
    }

    if (!['monthly', 'quarterly'].includes(planType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type. Must be monthly or quarterly'
      });
    }


    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate expiry date
    const paymentDate = new Date();
    const expiryDate = new Date();
    if (planType === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (planType === 'quarterly') {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    }


    // Create period string
    const period = planType === 'monthly' 
      ? `${paymentDate.toLocaleString('default', { month: 'long' })} ${paymentDate.getFullYear()}`
      : `Q${Math.ceil((paymentDate.getMonth() + 1) / 3)} ${paymentDate.getFullYear()}`;


    // Prepare new subscription details
    const newSubscriptionDetails = {
      planType,
      period,
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      paymentDate,
      expiryDate,
      stripeSessionId: stripeSessionId || `manual_${Date.now()}`
    };


    // Update subscription details
    user.hasPaid = true;
    user.subscriptionDetails = newSubscriptionDetails;

    await user.save();

    const responseData = {
      user: {
        id: user._id,
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        hasPaid: user.hasPaid,
        subscriptionDetails: user.subscriptionDetails
      }
    };

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: responseData
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription',
      error: error.message
    });
  }
};

// 📊 Get all users with revenue information (FIXED VERSION)
export const getAllUsersRevenue = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, filterBy } = req.query;

    // Build query
    let query = {};
    if (search) {
      query = {
        $or: [
          { email: { $regex: search, $options: 'i' } },
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { role: { $regex: search, $options: 'i' } }
        ]
      };
    }

    if (filterBy === 'paid') {
      query.hasPaid = true;
    } else if (filterBy === 'free') {
      query.hasPaid = false;
    }

    const users = await userModel
      .find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    const totalUsers = await userModel.countDocuments(query);

    if (users.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No users found matching criteria',
        data: {
          users: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalUsers: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      });
    }


    // 🔥 FIXED: Calculate both current and lifetime revenue for each user
    let totalCurrentRevenue = 0;
    let totalLifetimeRevenue = 0;

    const usersWithRevenue = users.map((user, index) => {
      
      let currentValue = 0; // Current subscription value
      let lifetimeValue = 0; // Historical lifetime value
      let subscriptionStatus = 'free';

      if (user.hasPaid && user.subscriptionDetails) {

        // Current subscription value
        currentValue = user.subscriptionDetails.amount || 0;
        totalCurrentRevenue += currentValue;

        const joinDate = new Date(user.createdAt);
        const now = new Date();
        const monthsSinceJoined = Math.max(1, 
          (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );


        // Calculate lifetime value
        if (user.subscriptionDetails.planType === 'monthly') {
          lifetimeValue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined);
        } else if (user.subscriptionDetails.planType === 'quarterly') {
          lifetimeValue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined / 3);
        }

        totalLifetimeRevenue += lifetimeValue;

        // Check subscription status
        if (user.subscriptionDetails.expiryDate && new Date(user.subscriptionDetails.expiryDate) > now) {
          subscriptionStatus = 'active';
        } else {
          subscriptionStatus = 'expired';
        }
      } else {
      }

      const displayName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email.split('@')[0];
      
      return {
        ...user,
        currentValue: Math.round(currentValue * 100) / 100, // 🔥 NEW: Current subscription value
        lifetimeValue: Math.round(lifetimeValue * 100) / 100, // Historical lifetime value
        subscriptionStatus,
        displayName
      };
    });

    const paginationInfo = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      hasNextPage: page * limit < totalUsers,
      hasPrevPage: page > 1
    };

    // Calculate summary stats
    const paidUsersInResults = usersWithRevenue.filter(user => user.hasPaid);
    const activeSubscriptionsInResults = usersWithRevenue.filter(user => user.subscriptionStatus === 'active').length;

    res.status(200).json({
      success: true,
      message: 'Users with revenue information fetched successfully',
      data: {
        users: usersWithRevenue,
        pagination: paginationInfo,
        summary: {
          totalUsersInResults: usersWithRevenue.length,
          paidUsersInResults: paidUsersInResults.length,
          totalCurrentRevenue: Math.round(totalCurrentRevenue * 100) / 100, // 🔥 NEW
          totalLifetimeRevenue: Math.round(totalLifetimeRevenue * 100) / 100, // 🔥 NEW
          activeSubscriptionsInResults
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users revenue information',
      error: error.message
    });
  }
};

