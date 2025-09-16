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


    res.json({ 
      success: true, 
      sessionId: session.id,
      url: session.url 
    });
  } catch (err) {
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


    res.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (err) {
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
    
    
    // Find user and check if they have active subscription
    const user = await userModel.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        code: "USER_NOT_FOUND"
      });
    }
    
    
    if (!user.hasPaid || !user.subscriptionDetails) {
      return res.status(400).json({
        success: false,
        message: "No active subscription found",
        code: "NO_ACTIVE_SUBSCRIPTION"
      });
    }
    
    // ✅ FIXED: Check if subscription status exists and is not already cancelled
    const currentStatus = user.subscriptionDetails.status || "active";
    
    if (currentStatus === "cancelled") {
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
    
    
    // ✅ FIXED: Use proper update syntax for nested fields
    const updateData = {
      "subscriptionDetails.status": "cancelled",
      "subscriptionDetails.cancelledAt": new Date(),
      "subscriptionDetails.cancellationReason": cancellationReason || "User requested cancellation",
      "subscriptionDetails.autoRenew": false,
      "subscriptionDetails.expiryDate": expiryDate
    };
    
    
    // Update subscription status
    const updatedUser = await userModel.findByIdAndUpdate(
      userId, 
      updateData,
      { new: true, runValidators: false } // ✅ ADDED: Return updated doc + skip validation
    );
    
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: "Failed to update subscription status",
        code: "UPDATE_FAILED"
      });
    }
    
    
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


  try {
    // req.body should now be a Buffer/string, not a parsed object
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );


    // Handle the event
    switch (event.type) {
      case "payment_intent.succeeded":
        const paymentIntent = event.data.object;
        
        // Check if this payment intent has metadata
        if (paymentIntent.metadata && paymentIntent.metadata.userId) {
          
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

          } catch (error) {
          }
        }
        break;

      case "payment_intent.created":
        // This is just informational, no action needed
        break;

      case "checkout.session.completed":
        const session = event.data.object;
        // Your existing checkout session handling code...
        break;

      case "payment_intent.payment_failed":
        const failedPayment = event.data.object;
        break;

      default:
    }

    res.json({ received: true });
  } catch (err) {
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
//
//     res.status(500).json({
//       success: false,
//       message: "Failed to cancel subscription",
//       code: "CANCELLATION_FAILED"
//     });
//   }
// });

export default router;