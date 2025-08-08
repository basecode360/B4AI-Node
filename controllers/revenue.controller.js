// =============================================
// 📁 controllers/revenueController.js (COMPLETE WITH DETAILED LOGGING)
// =============================================

import { userModel } from '../models/userModel.js';

// 📊 Get comprehensive revenue analytics (FIXED REVENUE CALCULATION)
export const getRevenueAnalytics = async (req, res) => {
  try {
    console.log('\n🔥 =============== REVENUE ANALYTICS START ===============');
    console.log('📊 Fetching revenue analytics...');
    console.log('⏰ Request timestamp:', new Date().toISOString());
    console.log('👤 Requested by user:', req.user?.email || 'Unknown');
    console.log('🔑 User role:', req.user?.role || 'Unknown');

    // Get all users with subscription details
    console.log('\n📊 Step 1: Fetching all users from database...');
    const allUsers = await userModel.find({}).lean();
    console.log(`📈 Total users found in database: ${allUsers.length}`);

    if (allUsers.length === 0) {
      console.log('⚠️ WARNING: No users found in database!');
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
    console.log('\n📊 Step 2: Filtering paid users...');
    const paidUsers = allUsers.filter(user => {
      const isPaid = user.hasPaid && user.subscriptionDetails;
      console.log(`👤 User ${user.email}: hasPaid=${user.hasPaid}, hasSubscriptionDetails=${!!user.subscriptionDetails}, isPaidUser=${isPaid}`);
      if (isPaid && user.subscriptionDetails) {
        console.log(`   💰 Subscription: ${user.subscriptionDetails.planType} - $${user.subscriptionDetails.amount} (${user.subscriptionDetails.currency || 'USD'})`);
        console.log(`   📅 Payment Date: ${user.subscriptionDetails.paymentDate}`);
        console.log(`   📅 Expiry Date: ${user.subscriptionDetails.expiryDate}`);
      }
      return isPaid;
    });

    console.log(`💰 Paid users found: ${paidUsers.length} out of ${allUsers.length} total users`);
    console.log(`📊 Conversion rate: ${allUsers.length > 0 ? ((paidUsers.length / allUsers.length) * 100).toFixed(2) : 0}%`);

    // Calculate current month and last month dates
    console.log('\n📊 Step 3: Setting up date calculations...');
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    console.log(`📅 Current date: ${now.toISOString()}`);
    console.log(`📅 Current month: ${currentMonth + 1}/${currentYear}`);
    console.log(`📅 Last month: ${lastMonth + 1}/${lastMonthYear}`);

    // 🔥 FIXED: Initialize revenue metrics with proper calculation
    console.log('\n📊 Step 4: Calculating revenue metrics...');
    let totalRevenue = 0;
    let totalLifetimeRevenue = 0; // NEW: Separate lifetime revenue
    let thisMonthRevenue = 0;
    let lastMonthRevenue = 0;
    
    const planDistribution = { monthly: 0, quarterly: 0 };
    const planRevenue = { monthly: 0, quarterly: 0 };

    console.log('💵 Processing each paid user for revenue calculation...');

    // Process each paid user
    paidUsers.forEach((user, index) => {
      console.log(`\n👤 Processing user ${index + 1}/${paidUsers.length}: ${user.email}`);
      
      const subscription = user.subscriptionDetails;
      if (!subscription || !subscription.amount) {
        console.log(`   ❌ Skipping user - no subscription details or amount`);
        return;
      }

      console.log(`   📋 Subscription details:`, {
        planType: subscription.planType,
        amount: subscription.amount,
        currency: subscription.currency,
        paymentDate: subscription.paymentDate,
        expiryDate: subscription.expiryDate
      });

      // 🔥 FIXED: Calculate both current subscription value AND lifetime value
      const subscriptionAmount = subscription.amount;
      
      // Add current subscription amount to total revenue
      totalRevenue += subscriptionAmount;
      console.log(`   💰 Current subscription amount: $${subscriptionAmount}`);
      console.log(`   📈 Running total revenue: $${totalRevenue.toFixed(2)}`);

      // Calculate lifetime value based on join date and plan (for analytics only)
      const joinDate = new Date(user.createdAt);
      const monthsSinceJoined = Math.max(1, 
        (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      console.log(`   📅 Join date: ${joinDate.toISOString()}`);
      console.log(`   📊 Months since joined: ${monthsSinceJoined.toFixed(2)}`);

      let userLifetimeValue = 0;
      if (subscription.planType === 'monthly') {
        userLifetimeValue = subscription.amount * Math.floor(monthsSinceJoined);
        planDistribution.monthly++;
        planRevenue.monthly += subscriptionAmount; // 🔥 FIXED: Use current amount, not lifetime
        console.log(`   💰 Monthly plan - Current: $${subscriptionAmount}, Lifetime: $${userLifetimeValue}`);
      } else if (subscription.planType === 'quarterly') {
        userLifetimeValue = subscription.amount * Math.floor(monthsSinceJoined / 3);
        planDistribution.quarterly++;
        planRevenue.quarterly += subscriptionAmount; // 🔥 FIXED: Use current amount, not lifetime
        console.log(`   💰 Quarterly plan - Current: $${subscriptionAmount}, Lifetime: $${userLifetimeValue}`);
      }

      totalLifetimeRevenue += userLifetimeValue;
      console.log(`   📈 User lifetime value: $${userLifetimeValue}`);
      console.log(`   📈 Running lifetime total: $${totalLifetimeRevenue.toFixed(2)}`);

      // Calculate this month and last month revenue (based on payment date)
      if (subscription.paymentDate) {
        const paymentDate = new Date(subscription.paymentDate);
        console.log(`   📅 Payment date: ${paymentDate.toISOString()}`);
        console.log(`   📅 Payment month/year: ${paymentDate.getMonth() + 1}/${paymentDate.getFullYear()}`);
        
        if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
          thisMonthRevenue += subscription.amount;
          console.log(`   ✅ Payment in current month! Added $${subscription.amount} to thisMonthRevenue = $${thisMonthRevenue}`);
        }
        if (paymentDate.getMonth() === lastMonth && paymentDate.getFullYear() === lastMonthYear) {
          lastMonthRevenue += subscription.amount;
          console.log(`   ✅ Payment in last month! Added $${subscription.amount} to lastMonthRevenue = $${lastMonthRevenue}`);
        }
      } else {
        console.log(`   ⚠️ No payment date found for user`);
      }
    });

    console.log('\n📊 Step 5: Final revenue calculations...');
    console.log(`💰 Total Current Revenue (Active Subscriptions): $${totalRevenue.toFixed(2)}`);
    console.log(`💰 Total Lifetime Revenue (Historical): $${totalLifetimeRevenue.toFixed(2)}`);
    console.log(`📅 This Month Revenue: $${thisMonthRevenue.toFixed(2)}`);
    console.log(`📅 Last Month Revenue: $${lastMonthRevenue.toFixed(2)}`);

    // Calculate percentage change
    const percentChange = lastMonthRevenue === 0 ? 
      (thisMonthRevenue > 0 ? 100 : 0) : 
      ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

    console.log(`📊 Percentage change calculation:`);
    console.log(`   Formula: ((${thisMonthRevenue} - ${lastMonthRevenue}) / ${lastMonthRevenue}) × 100`);
    console.log(`   Result: ${percentChange.toFixed(2)}%`);

    // Calculate average revenue per user (using current revenue)
    const averageRevenuePerUser = paidUsers.length > 0 ? totalRevenue / paidUsers.length : 0;
    console.log(`📊 Average revenue per user: $${totalRevenue} ÷ ${paidUsers.length} = $${averageRevenuePerUser.toFixed(2)}`);

    console.log('\n📊 Step 6: Plan distribution summary...');
    console.log(`📋 Plan Distribution:`, planDistribution);
    console.log(`💰 Plan Revenue:`, {
      monthly: planRevenue.monthly.toFixed(2),
      quarterly: planRevenue.quarterly.toFixed(2)
    });

    // Generate monthly data for charts (last 7 months including current)
    console.log('\n📊 Step 7: Generating monthly chart data...');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = [];
    
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date(currentYear, currentMonth - i, 1);
      const targetMonth = targetDate.getMonth();
      const targetYear = targetDate.getFullYear();

      console.log(`\n📅 Processing month: ${monthNames[targetMonth]} ${targetYear} (${targetMonth + 1}/${targetYear})`);

      let monthRevenue = 0;
      let monthUsers = 0;

      paidUsers.forEach(user => {
        if (user.subscriptionDetails && user.subscriptionDetails.paymentDate) {
          const paymentDate = new Date(user.subscriptionDetails.paymentDate);
          if (paymentDate.getMonth() === targetMonth && paymentDate.getFullYear() === targetYear) {
            monthRevenue += user.subscriptionDetails.amount;
            monthUsers++;
            console.log(`   👤 ${user.email}: +$${user.subscriptionDetails.amount} (${user.subscriptionDetails.planType})`);
          }
        }
      });

      console.log(`   📊 Month totals: ${monthUsers} users, $${monthRevenue.toFixed(2)} revenue`);

      monthlyData.push({
        month: monthNames[targetMonth],
        revenue: monthRevenue,
        users: monthUsers
      });
    }

    console.log('\n📊 Monthly data for charts:', monthlyData);

    // Prepare plan distribution data
    console.log('\n📊 Step 8: Preparing plan distribution data...');
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

    console.log('📊 Plan distribution data:', planDistributionData);

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

    console.log('\n🎉 =============== REVENUE ANALYTICS COMPLETE ===============');
    console.log('✅ Final analytics summary:', {
      totalRevenue: revenueAnalytics.totalRevenue,
      totalLifetimeRevenue: revenueAnalytics.totalLifetimeRevenue,
      thisMonthRevenue: revenueAnalytics.thisMonthRevenue,
      lastMonthRevenue: revenueAnalytics.lastMonthRevenue,
      percentChange: revenueAnalytics.percentChange,
      totalPaidUsers: revenueAnalytics.totalPaidUsers,
      totalUsers: revenueAnalytics.totalUsers,
      conversionRate: revenueAnalytics.conversionRate,
      averageRevenuePerUser: revenueAnalytics.averageRevenuePerUser
    });

    console.log('📊 Monthly data count:', revenueAnalytics.monthlyData.length);
    console.log('📊 Plan distribution count:', revenueAnalytics.planDistribution.length);
    console.log('⏰ Response timestamp:', new Date().toISOString());
    console.log('===============================================================\n');

    res.status(200).json({
      success: true,
      message: 'Revenue analytics fetched successfully',
      data: revenueAnalytics
    });

  } catch (error) {
    console.error('\n💥 =============== REVENUE ANALYTICS ERROR ===============');
    console.error('❌ Error fetching revenue analytics:', error);
    console.error('📍 Error stack:', error.stack);
    console.error('⏰ Error timestamp:', new Date().toISOString());
    console.error('=========================================================\n');
    
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
    console.log('\n🔥 =============== REVENUE SUMMARY START ===============');
    console.log('📊 Fetching revenue summary...');
    console.log('⏰ Request timestamp:', new Date().toISOString());

    const paidUsers = await userModel.find({ hasPaid: true }).lean();
    const totalUsers = await userModel.countDocuments();

    console.log(`👥 Paid users found: ${paidUsers.length}`);
    console.log(`👥 Total users: ${totalUsers}`);

    let totalRevenue = 0;
    let monthlyRevenue = 0;
    let quarterlyRevenue = 0;
    let activeSubscriptions = 0;

    const now = new Date();
    console.log(`📅 Current date: ${now.toISOString()}`);

    console.log('\n💰 Processing paid users...');
    paidUsers.forEach((user, index) => {
      console.log(`\n👤 User ${index + 1}: ${user.email}`);
      
      if (user.subscriptionDetails && user.subscriptionDetails.amount) {
        console.log(`   📋 Subscription: ${user.subscriptionDetails.planType} - $${user.subscriptionDetails.amount}`);
        
        // Check if subscription is still active
        if (user.subscriptionDetails.expiryDate && new Date(user.subscriptionDetails.expiryDate) > now) {
          activeSubscriptions++;
          console.log(`   ✅ Subscription is ACTIVE (expires: ${user.subscriptionDetails.expiryDate})`);
        } else {
          console.log(`   ❌ Subscription is EXPIRED or no expiry date`);
        }

        const joinDate = new Date(user.createdAt);
        const monthsSinceJoined = Math.max(1, 
          (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        console.log(`   📅 Months since joined: ${monthsSinceJoined.toFixed(2)}`);

        let userRevenue = 0;
        if (user.subscriptionDetails.planType === 'monthly') {
          userRevenue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined);
          monthlyRevenue += userRevenue;
          console.log(`   💰 Monthly revenue: $${userRevenue.toFixed(2)}`);
        } else if (user.subscriptionDetails.planType === 'quarterly') {
          userRevenue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined / 3);
          quarterlyRevenue += userRevenue;
          console.log(`   💰 Quarterly revenue: $${userRevenue.toFixed(2)}`);
        }
        totalRevenue += userRevenue;
        console.log(`   📈 Running total: $${totalRevenue.toFixed(2)}`);
      } else {
        console.log(`   ⚠️ No subscription details or amount found`);
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

    console.log('\n✅ Revenue summary complete:', summaryData);
    console.log('=============== REVENUE SUMMARY END ===============\n');

    res.status(200).json({
      success: true,
      message: 'Revenue summary fetched successfully',
      data: summaryData
    });

  } catch (error) {
    console.error('\n💥 =============== REVENUE SUMMARY ERROR ===============');
    console.error('❌ Error fetching revenue summary:', error);
    console.error('📍 Error stack:', error.stack);
    console.error('=====================================================\n');
    
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
    console.log(`\n🔥 =============== USER REVENUE START ===============`);
    console.log(`👤 Fetching revenue for user ID: ${userId}`);
    console.log('⏰ Request timestamp:', new Date().toISOString());
    
    const user = await userModel.findById(userId).select('-password').lean();
    if (!user) {
      console.log(`❌ User not found with ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${user.email}`);
    console.log(`📋 User details:`, {
      email: user.email,
      hasPaid: user.hasPaid,
      role: user.role,
      createdAt: user.createdAt,
      hasSubscriptionDetails: !!user.subscriptionDetails
    });

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
      console.log('\n💰 Processing subscription details...');
      const subscription = user.subscriptionDetails;
      console.log('📋 Subscription data:', subscription);
      
      const joinDate = new Date(user.createdAt);
      const now = new Date();
      const monthsSinceJoined = Math.max(1, 
        (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
      );

      console.log(`📅 Join date: ${joinDate.toISOString()}`);
      console.log(`📅 Current date: ${now.toISOString()}`);
      console.log(`📊 Months since joined: ${monthsSinceJoined.toFixed(2)}`);

      // Calculate lifetime value
      if (subscription.planType === 'monthly') {
        userRevenue.lifetimeValue = subscription.amount * Math.floor(monthsSinceJoined);
        console.log(`💰 Monthly plan lifetime value: $${subscription.amount} × ${Math.floor(monthsSinceJoined)} = $${userRevenue.lifetimeValue}`);
      } else if (subscription.planType === 'quarterly') {
        userRevenue.lifetimeValue = subscription.amount * Math.floor(monthsSinceJoined / 3);
        console.log(`💰 Quarterly plan lifetime value: $${subscription.amount} × ${Math.floor(monthsSinceJoined / 3)} = $${userRevenue.lifetimeValue}`);
      }

      userRevenue.currentPlan = subscription.planType;
      userRevenue.monthlyValue = subscription.amount;
      userRevenue.nextBilling = subscription.expiryDate;
      
      // Check if subscription is active
      if (subscription.expiryDate && new Date(subscription.expiryDate) > now) {
        userRevenue.subscriptionStatus = 'active';
        console.log(`✅ Subscription status: ACTIVE (expires: ${subscription.expiryDate})`);
      } else {
        userRevenue.subscriptionStatus = 'expired';
        console.log(`❌ Subscription status: EXPIRED (expired: ${subscription.expiryDate || 'No expiry date'})`);
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
        console.log('📜 Payment history entry created:', historyEntry);
      } else {
        console.log('⚠️ No payment date found in subscription');
      }
    } else {
      console.log('❌ User has no paid subscription or subscription details');
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

    console.log('\n✅ User revenue calculation complete:', {
      lifetimeValue: userRevenue.lifetimeValue,
      subscriptionStatus: userRevenue.subscriptionStatus,
      currentPlan: userRevenue.currentPlan,
      monthlyValue: userRevenue.monthlyValue
    });
    console.log('=============== USER REVENUE END ===============\n');

    res.status(200).json({
      success: true,
      message: 'User revenue details fetched successfully',
      data: responseData
    });

  } catch (error) {
    console.error('\n💥 =============== USER REVENUE ERROR ===============');
    console.error('❌ Error fetching user revenue:', error);
    console.error('📍 Error stack:', error.stack);
    console.error('===================================================\n');
    
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
    console.log('\n🔥 =============== UPDATE SUBSCRIPTION START ===============');
    console.log('⏰ Request timestamp:', new Date().toISOString());
    console.log('📋 Request body:', req.body);
    console.log('👤 Requested by:', req.user?.email || 'Unknown');

    const { userId, planType, amount, currency = 'USD', stripeSessionId } = req.body;

    // Validation
    if (!userId || !planType || !amount) {
      console.log('❌ Validation failed: Missing required fields');
      console.log('📋 Received:', { userId: !!userId, planType: !!planType, amount: !!amount });
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, planType, amount'
      });
    }

    if (!['monthly', 'quarterly'].includes(planType)) {
      console.log(`❌ Validation failed: Invalid plan type '${planType}'`);
      return res.status(400).json({
        success: false,
        message: 'Invalid plan type. Must be monthly or quarterly'
      });
    }

    console.log('✅ Validation passed');

    const user = await userModel.findById(userId);
    if (!user) {
      console.log(`❌ User not found with ID: ${userId}`);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ User found: ${user.email}`);
    console.log('📋 Current user data:', {
      email: user.email,
      currentHasPaid: user.hasPaid,
      currentSubscription: user.subscriptionDetails
    });

    // Calculate expiry date
    const paymentDate = new Date();
    const expiryDate = new Date();
    if (planType === 'monthly') {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (planType === 'quarterly') {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    }

    console.log('📅 Date calculations:', {
      paymentDate: paymentDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      planType
    });

    // Create period string
    const period = planType === 'monthly' 
      ? `${paymentDate.toLocaleString('default', { month: 'long' })} ${paymentDate.getFullYear()}`
      : `Q${Math.ceil((paymentDate.getMonth() + 1) / 3)} ${paymentDate.getFullYear()}`;

    console.log(`📅 Period string: ${period}`);

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

    console.log('💰 New subscription details:', newSubscriptionDetails);

    // Update subscription details
    user.hasPaid = true;
    user.subscriptionDetails = newSubscriptionDetails;

    console.log('💾 Saving user with updated subscription...');
    await user.save();

    console.log(`✅ Successfully updated subscription for user ${user.email}`);
    console.log('📊 Updated details:', {
      planType,
      amount: parseFloat(amount),
      period,
      expiryDate: expiryDate.toISOString()
    });

    const responseData = {
      user: {
        id: user._id,
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim(),
        hasPaid: user.hasPaid,
        subscriptionDetails: user.subscriptionDetails
      }
    };

    console.log('🎉 Update subscription complete!');
    console.log('=============== UPDATE SUBSCRIPTION END ===============\n');

    res.status(200).json({
      success: true,
      message: 'Subscription updated successfully',
      data: responseData
    });

  } catch (error) {
    console.error('\n💥 =============== UPDATE SUBSCRIPTION ERROR ===============');
    console.error('❌ Error updating subscription:', error);
    console.error('📍 Error stack:', error.stack);
    console.error('=========================================================\n');
    
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
    console.log('\n🔥 =============== GET ALL USERS REVENUE START ===============');
    console.log('⏰ Request timestamp:', new Date().toISOString());
    console.log('📋 Query params:', req.query);

    const { page = 1, limit = 50, search, filterBy } = req.query;
    
    console.log('📊 Parameters:', { page, limit, search, filterBy });

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
      console.log('🔍 Search query applied:', query);
    }

    if (filterBy === 'paid') {
      query.hasPaid = true;
      console.log('💰 Filter: Only paid users');
    } else if (filterBy === 'free') {
      query.hasPaid = false;
      console.log('🆓 Filter: Only free users');
    }

    console.log('📊 Final MongoDB query:', query);

    const users = await userModel
      .find(query)
      .select('-password')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    const totalUsers = await userModel.countDocuments(query);

    console.log(`📊 Database results: Found ${users.length} users out of ${totalUsers} total matching query`);
    console.log(`📄 Pagination: Page ${page}, Limit ${limit}, Skip ${(page - 1) * limit}`);

    if (users.length === 0) {
      console.log('⚠️ No users found matching criteria');
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

    console.log('\n💰 Processing users for revenue calculation...');

    // 🔥 FIXED: Calculate both current and lifetime revenue for each user
    let totalCurrentRevenue = 0;
    let totalLifetimeRevenue = 0;

    const usersWithRevenue = users.map((user, index) => {
      console.log(`\n👤 Processing user ${index + 1}/${users.length}: ${user.email}`);
      
      let currentValue = 0; // Current subscription value
      let lifetimeValue = 0; // Historical lifetime value
      let subscriptionStatus = 'free';

      console.log(`📋 User basic info:`, {
        email: user.email,
        hasPaid: user.hasPaid,
        hasSubscriptionDetails: !!user.subscriptionDetails,
        createdAt: user.createdAt
      });

      if (user.hasPaid && user.subscriptionDetails) {
        console.log(`💰 Processing paid user subscription...`);
        console.log(`📋 Subscription details:`, user.subscriptionDetails);

        // Current subscription value
        currentValue = user.subscriptionDetails.amount || 0;
        totalCurrentRevenue += currentValue;

        const joinDate = new Date(user.createdAt);
        const now = new Date();
        const monthsSinceJoined = Math.max(1, 
          (now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        console.log(`📅 Months since joined: ${monthsSinceJoined.toFixed(2)}`);

        // Calculate lifetime value
        if (user.subscriptionDetails.planType === 'monthly') {
          lifetimeValue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined);
          console.log(`💰 Monthly plan - Current: $${currentValue}, Lifetime: $${lifetimeValue}`);
        } else if (user.subscriptionDetails.planType === 'quarterly') {
          lifetimeValue = user.subscriptionDetails.amount * Math.floor(monthsSinceJoined / 3);
          console.log(`💰 Quarterly plan - Current: $${currentValue}, Lifetime: $${lifetimeValue}`);
        }

        totalLifetimeRevenue += lifetimeValue;

        // Check subscription status
        if (user.subscriptionDetails.expiryDate && new Date(user.subscriptionDetails.expiryDate) > now) {
          subscriptionStatus = 'active';
          console.log(`✅ Subscription ACTIVE (expires: ${user.subscriptionDetails.expiryDate})`);
        } else {
          subscriptionStatus = 'expired';
          console.log(`❌ Subscription EXPIRED (expired: ${user.subscriptionDetails.expiryDate || 'No expiry date'})`);
        }
      } else {
        console.log(`🆓 Free user - no subscription details`);
      }

      const displayName = `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim() || user.email.split('@')[0];
      
      console.log(`📊 Final user data - Current: $${currentValue}, Lifetime: $${lifetimeValue}, Status: ${subscriptionStatus}`);

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

    console.log('\n📄 Pagination info:', paginationInfo);

    // Calculate summary stats
    const paidUsersInResults = usersWithRevenue.filter(user => user.hasPaid);
    const activeSubscriptionsInResults = usersWithRevenue.filter(user => user.subscriptionStatus === 'active').length;

    console.log('\n📊 Results summary:', {
      totalUsersInResults: usersWithRevenue.length,
      paidUsersInResults: paidUsersInResults.length,
      totalCurrentRevenue: totalCurrentRevenue.toFixed(2),
      totalLifetimeRevenue: totalLifetimeRevenue.toFixed(2),
      activeSubscriptionsInResults
    });

    console.log('✅ All users revenue calculation complete!');
    console.log('=============== GET ALL USERS REVENUE END ===============\n');

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
    console.error('\n💥 =============== GET ALL USERS REVENUE ERROR ===============');
    console.error('❌ Error fetching users revenue:', error);
    console.error('📍 Error stack:', error.stack);
    console.error('📋 Request details:', {
      query: req.query,
      user: req.user?.email || 'Unknown'
    });
    console.error('=============================================================\n');
    
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users revenue information',
      error: error.message
    });
  }
};

