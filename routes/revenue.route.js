// =============================================
// 📁 routes/revenueRoutes.js (COMPLETE ROUTES FILE)
// =============================================

import express from 'express';
import { 
  getRevenueAnalytics, 
  getRevenueSummary, 
  getUserRevenue, 
  updateSubscription,
  getAllUsersRevenue,
} from '../controllers/revenue.controller.js';
import { sessionOnlyAuth , authenticateToken} from '../middleware/authMiddleware.js';
import {authorizeAdmin} from "../middleware/authorizeMiddleware.js";

const router = express.Router();



// 📊 Revenue Analytics Routes (Admin only)
router.get('/analytics' ,authenticateToken,authorizeAdmin,getRevenueAnalytics);
router.get('/summary',authenticateToken,authorizeAdmin, getRevenueSummary);
router.get('/users',authenticateToken, authorizeAdmin,getAllUsersRevenue);
/*router.get('/user/:userId',  getUserRevenue); //these routes are not using on frontend
router.post('/subscription/update',  updateSubscription);*/

export default router;