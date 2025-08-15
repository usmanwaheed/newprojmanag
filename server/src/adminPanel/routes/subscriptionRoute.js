import express from "express";
import { body } from "express-validator";
import {
    getCurrentSubscription,
    getSubscriptionHistory,
    cancelSubscription,
    changePlan,
    getAllSubscriptions,
    getSubscriptionAnalytics,
    toggleSubscriptionStatus,
    createSubscription,
    confirmSubscriptionPayment,
    // handleStripeWebhook,
} from "../controllers/subscriptionController.js";
import { verifyUser, verifyCompany } from "../../middleware/authMiddleware.js";
import { SuperAdminPlans } from "../model/SuperAdminPlan.js";

const router = express.Router();

// Validation middleware
const subscriptionValidation = [
    body("planId")
        .isMongoId()
        .withMessage("Valid plan ID is required")
        .custom(async (value) => {
            const plan = await SuperAdminPlans.findById(value);
            if (!plan || !plan.isActive) {
                throw new Error("Plan not found or inactive");
            }
            return true;
        }),
    body("paymentMethodId")
        .optional()
        .isString()
        .withMessage("Payment method ID must be a string"),
    body("customerDetails")
        .optional()
        .isObject()
        .withMessage("Customer details must be an object"),
    body("customerDetails.email")
        .optional()
        .isEmail()
        .withMessage("Valid email is required"),
    body("customerDetails.name")
        .optional()
        .isString()
        .withMessage("Customer name must be a string"),
    body("agreementAccepted")
        .optional()
        .isBoolean()
        .withMessage("Agreement acceptance must be boolean"),
];

const changePlanValidation = [
    body("newPlanId")
        .isMongoId()
        .withMessage("Valid new plan ID is required")
        .custom(async (value) => {
            const plan = await SuperAdminPlans.findById(value);
            if (!plan || !plan.isActive) {
                throw new Error("New plan not found or inactive");
            }
            return true;
        }),
    body("reason")
        .optional()
        .isString()
        .withMessage("Reason must be a string")
        .isLength({ max: 500 })
        .withMessage("Reason cannot exceed 500 characters"),
];

// Payment confirmation validation
const paymentConfirmationValidation = [
    body("subscriptionId")
        .isString()
        .withMessage("Subscription ID is required"),
    body("paymentIntentId")
        .isString()
        .withMessage("Payment Intent ID is required"),
];

// COMPANY-ONLY SUBSCRIPTION ROUTES

// Create new subscription (COMPANY ONLY)
router.post("/", verifyCompany(), subscriptionValidation, createSubscription);

// Confirm subscription payment (COMPANY ONLY) - for 3D Secure payments
router.post(
    "/confirm-payment",
    verifyCompany(),
    paymentConfirmationValidation,
    confirmSubscriptionPayment
);

// Cancel subscription (COMPANY ONLY)
router.delete("/:id", verifyCompany(), cancelSubscription);

// Change subscription plan (COMPANY ONLY)
router.put(
    "/:id/change-plan",
    verifyCompany(),
    changePlanValidation,
    changePlan
);

// SHARED ROUTES (Both companies and users can view)

// Get current active subscription
// - Companies see their own subscription
// - Users see their company's subscription
router.get("/current", verifyUser(["company", "user"]), getCurrentSubscription);

// Get subscription history
// - Companies see their own subscription history
// - Users see their company's subscription history
router.get("/history", verifyUser(["company", "user"]), getSubscriptionHistory);

// ADMIN ROUTES (Super admin only)

// Get all subscriptions (admin) - only shows company subscriptions
router.get("/all", verifyUser(["superadmin"]), getAllSubscriptions);

// Get subscription analytics (admin) - only shows company subscription analytics
router.get("/analytics", verifyUser(["superadmin"]), getSubscriptionAnalytics);

// Toggle subscription status (admin) - only affects company subscriptions
router.patch(
    "/:id/toggle-status",
    verifyUser(["superadmin"]),
    toggleSubscriptionStatus
);

// DEVELOPMENT ROUTES (Remove webhooks for dev mode)
// WEBHOOK ROUTE COMMENTED OUT FOR DEVELOPMENT
// Uncomment this for production:
// router.post("/webhook", express.raw({ type: 'application/json' }), handleStripeWebhook);

// DEV MODE: Manual subscription status sync route
router.post(
    "/dev-sync/:subscriptionId",
    verifyUser(["superadmin"]),
    async (req, res) => {
        try {
            const { subscriptionId } = req.params;
            const { Subscription } = await import("../model/subscription.js");
            const Stripe = (await import("stripe")).default;
            const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

            const subscription = await Subscription.findById(subscriptionId);
            if (!subscription || !subscription.stripeSubscriptionId) {
                return res.status(404).json({
                    success: false,
                    message:
                        "Subscription not found or no Stripe subscription ID",
                });
            }

            // Get current status from Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(
                subscription.stripeSubscriptionId
            );

            // Update local subscription status
            let newStatus = subscription.status;
            switch (stripeSubscription.status) {
                case "active":
                    newStatus = "active";
                    break;
                case "past_due":
                    newStatus = "past_due";
                    break;
                case "canceled":
                    newStatus = "canceled";
                    break;
                case "unpaid":
                    newStatus = "unpaid";
                    break;
                case "trialing":
                    newStatus = "trial";
                    break;
            }

            subscription.status = newStatus;
            await subscription.save();

            res.json({
                success: true,
                message: "Subscription synced successfully",
                data: {
                    localStatus: newStatus,
                    stripeStatus: stripeSubscription.status,
                    subscription,
                },
            });
        } catch (error) {
            console.error("Dev sync error:", error);
            res.status(500).json({
                success: false,
                message: "Sync failed",
                error: error.message,
            });
        }
    }
);

export default router;
