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
router.get('/analytics' , getRevenueAnalytics); //authenticateToken,authorizeAdmin,
router.get('/summary', getRevenueSummary); // authenticateToken,authorizeAdmin,
router.get('/users', getAllUsersRevenue); // authenticateToken, authorizeAdmin
router.get('/user/:userId',  getUserRevenue);
/*router.get('/user/:userId',  getUserRevenue); //these routes are not using on frontend
router.post('/subscription/update',  updateSubscription);*/

export default router;