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
import { authenticateToken } from '../middleware/authMiddleware.js';
import {authorizeAdmin} from "../middleware/authorizeMiddleware.js";

const router = express.Router();



// 📊 Revenue Analytics Routes (Admin only)
router.get('/analytics', /*authenticateToken, authorizeAdmin,*/ getRevenueAnalytics);
router.get('/summary', /*authenticateToken, authorizeAdmin,*/ getRevenueSummary);
router.get('/users', /*authenticateToken, authorizeAdmin,*/ getAllUsersRevenue);
router.get('/user/:userId', /*authenticateToken, authorizeAdmin,*/ getUserRevenue);
router.post('/subscription/update', /*authenticateToken, authorizeAdmin,*/ updateSubscription);

export default router;