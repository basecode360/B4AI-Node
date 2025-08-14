import express from "express";
import Stripe from "stripe";
import { userModel } from "../models/userModel.js";
import { authenticateToken } from "../middleware/authMiddleware.js"; // Your auth middleware

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_TEST_KEY);

// Create checkout session - WITH YOUR AUTH MIDDLEWARE
router.post("/create-checkout-session", authenticateToken, async (req, res) => {
  try {
    // User info from your middleware
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Get plan details from request
    const { planType, amount, period } = req.body;

    // Validate plan data
    if (!planType || !amount || !period) {
      return res.status(400).json({
        success: false,
        message: "Plan details required (planType, amount, period)",
        code: "INVALID_REQUEST"
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: userEmail,
      metadata: {
        userId: userId.toString(), // Convert to string for Stripe
        planType: planType,
        period: period
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `B4AI Premium - ${period}`,
              description: "Full access to performance analytics & question database",
            },
            unit_amount: amount, // amount in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/subscription`,
    });

    console.log(`✅ Checkout session created for user: ${userId}`);

    res.json({ 
      success: true, 
      sessionId: session.id,
      url: session.url 
    });
  } catch (err) {
    console.error("Stripe session error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create checkout session",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: "STRIPE_ERROR"
    });
  }
});

router.post("/create-payment-intent", authenticateToken, async (req, res) => {
  try {
    // User info from your middleware
    const userId = req.user.userId;
    const userEmail = req.user.email;

    // Get plan details from request
    const { planType, amount, period } = req.body;

    // Validate plan data
    if (!planType || !amount || !period) {
      return res.status(400).json({
        success: false,
        message: "Plan details required (planType, amount, period)",
        code: "INVALID_REQUEST"
      });
    }

    // Create a PaymentIntent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // amount in cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: userId.toString(), // Convert to string for Stripe
        planType: planType,
        period: period,
        userEmail: userEmail
      },
      description: `B4AI Premium - ${period} subscription for ${userEmail}`,
    });

    console.log(`✅ Payment intent created for user: ${userId}, amount: $${amount/100}`);

    res.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (err) {
    console.error("Stripe payment intent error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Failed to create payment intent",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      code: "STRIPE_ERROR"
    });
  }
});

// Cancel subscription endpoint
router.post("/cancel-subscription", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { cancellationReason } = req.body;
    
    console.log(`🚫 Cancellation request from user: ${userId}`);
    console.log(`📝 Request body:`, req.body);
    console.log(`👤 User from auth:`, req.user);
    
    // Find user and check if they have active subscription
    const user = await userModel.findById(userId);
    
    if (!user) {
      console.log(`❌ User not found: ${userId}`);
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }
    
    console.log(`✅ User found: ${user.email}`);
    console.log(`💰 Has paid: ${user.hasPaid}`);
    console.log(`📋 Subscription details:`, user.subscriptionDetails);
    
    if (!user.hasPaid || !user.subscriptionDetails) {
      console.log(`❌ No active subscription found for user: ${userId}`);
      return res.status(400).json({
        success: false,
        message: "No active subscription found",
        code: "NO_ACTIVE_SUBSCRIPTION"
      });
    }
    
    // ✅ FIXED: Check if subscription status exists and is not already cancelled
    const currentStatus = user.subscriptionDetails.status || "active";
    console.log(`📊 Current subscription status: ${currentStatus}`);
    
    if (currentStatus === "cancelled") {
      console.log(`❌ Subscription already cancelled for user: ${userId}`);
      return res.status(400).json({
        success: false,
        message: "Subscription is already cancelled",
        code: "ALREADY_CANCELLED"
      });
    }
    
    // Calculate remaining days
    const now = new Date();
    const paymentDate = new Date(user.subscriptionDetails.paymentDate);
    
    // Calculate expiry based on plan type
    let expiryDate = new Date(paymentDate);
    if (user.subscriptionDetails.planType === "monthly") {
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    } else if (user.subscriptionDetails.planType === "quarterly") {
      expiryDate.setMonth(expiryDate.getMonth() + 3);
    } else {
      // Default to 1 month if plan type is unclear
      expiryDate.setMonth(expiryDate.getMonth() + 1);
    }
    
    const remainingDays = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
    
    console.log(`📅 Payment date: ${paymentDate}`);
    console.log(`📅 Calculated expiry: ${expiryDate}`);
    console.log(`📊 Remaining days: ${remainingDays}`);
    
    // ✅ FIXED: Use proper update syntax for nested fields
    const updateData = {
      "subscriptionDetails.status": "cancelled",
      "subscriptionDetails.cancelledAt": new Date(),
      "subscriptionDetails.cancellationReason": cancellationReason || "User requested cancellation",
      "subscriptionDetails.autoRenew": false,
      "subscriptionDetails.expiryDate": expiryDate
    };
    
    console.log(`🔄 Updating user with data:`, updateData);
    
    // Update subscription status
    const updatedUser = await userModel.findByIdAndUpdate(
      userId, 
      updateData,
      { new: true, runValidators: false } // ✅ ADDED: Return updated doc + skip validation
    );
    
    if (!updatedUser) {
      console.log(`❌ Failed to update user: ${userId}`);
      return res.status(500).json({
        success: false,
        message: "Failed to update subscription status",
        code: "UPDATE_FAILED"
      });
    }
    
    console.log(`✅ Subscription cancelled for user: ${userId}`);
    console.log(`✅ Updated subscription status: ${updatedUser.subscriptionDetails.status}`);
    
    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      cancellationDetails: {
        cancelledAt: new Date(),
        remainingDays: remainingDays,
        expiryDate: expiryDate,
        planType: user.subscriptionDetails.planType,
        accessUntil: expiryDate.toLocaleDateString()
      }
    });
  } catch (error) {
    console.error("❌ Cancel subscription error:", error);
    console.error("❌ Error stack:", error.stack);
    res.status(500).json({
      success: false,
      message: "Failed to cancel subscription",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: "CANCELLATION_FAILED"
    });
  }
});

// Webhook endpoint - NO AUTH (Called by Stripe)
router.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).json({
      success: false,
      message: "No stripe signature found"
    });
  }

  // DEBUG: Log webhook details
  console.log("🔍 Webhook Debug Info:");
  console.log("📝 Signature header:", sig);
  console.log("🔑 Webhook secret (first 10 chars):", process.env.STRIPE_WEBHOOK_SECRET?.substring(0, 10) + "...");
  console.log("📦 Body type:", typeof req.body);
  console.log("📏 Body length:", req.body.length);
  console.log("🏷️ Body preview:", req.body.toString().substring(0, 100) + "...");

  try {
    // req.body should now be a Buffer/string, not a parsed object
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log(`🔔 Webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        console.log(`💰 Payment Intent Succeeded: ${paymentIntent.id}`);
        console.log(`📦 Metadata:`, paymentIntent.metadata);
        
        // Check if this payment intent has metadata
        if (paymentIntent.metadata && paymentIntent.metadata.userId) {
          console.log(`🔍 Updating user: ${paymentIntent.metadata.userId}`);
          
          try {
            // Update user payment status
            const piUpdateResult = await userModel.findByIdAndUpdate(
              paymentIntent.metadata.userId,
              { 
                hasPaid: true,
                subscriptionDetails: {
                  planType: paymentIntent.metadata.planType,
                  period: paymentIntent.metadata.period,
                  amount: paymentIntent.amount / 100,
                  currency: paymentIntent.currency,
                  paymentDate: new Date(),
                  stripePaymentIntentId: paymentIntent.id,
                  stripeCustomerId: paymentIntent.customer,
                  paymentMethod: paymentIntent.payment_method,
                  status: 'active'
                }
              },
              { new: true }
            );

            if (piUpdateResult) {
              console.log(`✅ Payment successful for user: ${paymentIntent.metadata.userId}`);
              console.log(`💾 Updated user hasPaid:`, piUpdateResult.hasPaid);
            } else {
              console.error(`❌ Failed to update payment status for user: ${paymentIntent.metadata.userId}`);
            }
          } catch (error) {
            console.error(`❌ Error updating user:`, error);
          }
        }
        break;

      case "payment_intent.created":
        console.log(`📝 Payment intent created: ${event.data.object.id}`);
        // This is just informational, no action needed
        break;

      case "checkout.session.completed":
        const session = event.data.object;
        console.log(`✅ Checkout session completed: ${session.id}`);
        // Your existing checkout session handling code...
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        console.log(`❌ Payment failed: ${failedPayment.id}`);
        break;

      default:
        console.log(`⚠️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(400).json({
      success: false,
      message: `Webhook Error: ${err.message}`
    });
  }
});

// Reactivate subscription endpoint
router.post("/reactivate-subscription", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    console.log(`🔄 Reactivation request from user: ${userId}`);
    
    const user = await userModel.findById(userId);
    
    if (!user || !user.subscriptionDetails) {
      return res.status(404).json({
        success: false,
        message: "No subscription found",
        code: "NO_SUBSCRIPTION"
      });
    }
    
    if (user.subscriptionDetails.status !== "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Subscription is not cancelled",
        code: "NOT_CANCELLED"
      });
    }
    
    // Check if subscription hasn't expired yet
    const now = new Date();
    const expiryDate = user.subscriptionDetails.expiryDate;
    
    if (now > expiryDate) {
      return res.status(400).json({
        success: false,
        message: "Subscription has already expired. Please purchase a new subscription.",
        code: "SUBSCRIPTION_EXPIRED"
      });
    }
    
    // Reactivate subscription
    await userModel.findByIdAndUpdate(userId, {
      "subscriptionDetails.status": "active",
      "subscriptionDetails.autoRenew": true,
      "subscriptionDetails.cancelledAt": null,
      "subscriptionDetails.cancellationReason": null
    });
    
    console.log(`✅ Subscription reactivated for user: ${userId}`);
    
    res.json({
      success: true,
      message: "Subscription reactivated successfully",
      reactivationDetails: {
        reactivatedAt: new Date(),
        expiryDate: expiryDate,
        planType: user.subscriptionDetails.planType
      }
    });
  } catch (error) {
    console.error("Reactivate subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reactivate subscription",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: "REACTIVATION_FAILED"
    });
  }
});

// Enhanced payment status to include cancellation info
router.get("/payment-status", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const user = await userModel
      .findById(userId)
      .select("hasPaid subscriptionDetails email profile.firstName profile.lastName");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }

    // ✅ Enhanced response with cancellation details
    const subscriptionDetails = user.subscriptionDetails || null;
    let accessStatus = "none";
    let remainingDays = 0;
    
    if (subscriptionDetails) {
      const now = new Date();
      const expiryDate = subscriptionDetails.expiryDate || 
        new Date(subscriptionDetails.paymentDate.getTime() + 
          (subscriptionDetails.planType === "monthly" ? 30 : 90) * 24 * 60 * 60 * 1000);
      
      remainingDays = Math.max(0, Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24)));
      
      if (remainingDays > 0) {
        accessStatus = subscriptionDetails.status === "cancelled" ? "cancelled_but_active" : "active";
      } else {
        accessStatus = "expired";
      }
    }

    res.json({
      success: true,
      hasPaid: user.hasPaid || false,
      subscriptionDetails: subscriptionDetails,
      accessStatus: accessStatus,
      remainingDays: remainingDays,
      cancellationInfo: subscriptionDetails ? {
        isCancelled: subscriptionDetails.status === "cancelled",
        cancelledAt: subscriptionDetails.cancelledAt,
        cancellationReason: subscriptionDetails.cancellationReason,
        canReactivate: subscriptionDetails.status === "cancelled" && remainingDays > 0
      } : null,
      user: {
        email: user.email,
        name: `${user.profile?.firstName || ''} ${user.profile?.lastName || ''}`.trim()
      }
    });
  } catch (error) {
    console.error("Payment status error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error checking payment status",
      code: "INTERNAL_ERROR"
    });
  }
});

// Cancel subscription - WITH AUTH (for future use)
// router.post("/cancel-subscription", authenticateToken, async (req, res) => {
//   try {
//     const userId = req.user.userId;
    
//     // Update user subscription status
//     await userModel.findByIdAndUpdate(userId, {
//       "subscriptionDetails.cancelledAt": new Date(),
//       "subscriptionDetails.status": "cancelled"
//     });

//     res.json({
//       success: true,
//       message: "Subscription cancelled successfully"
//     });
//   } catch (error) {
//     console.error("Cancel subscription error:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to cancel subscription",
//       code: "CANCELLATION_FAILED"
//     });
//   }
// });

export default router;