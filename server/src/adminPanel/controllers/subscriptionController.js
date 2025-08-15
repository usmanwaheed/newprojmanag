import { Subscription } from "../model/subscription.js";
import Stripe from "stripe";
import { User } from "../../models/userModel.js";
import { SuperAdminPlans } from "../model/SuperAdminPlan.js";
import { NotificationService } from "../../utils/notificationService.js";
import { ROLES } from "../../config/roles.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Helper function to create Stripe products and prices for plans
const createStripeProductAndPrice = async (plan) => {
    try {
        // Create product in Stripe
        const product = await stripe.products.create({
            name: plan.name,
            description: plan.description,
            metadata: {
                planId: plan._id.toString(),
            },
        });

        // Create price in Stripe
        const price = await stripe.prices.create({
            unit_amount: Math.round(plan.price * 100), // Convert to cents
            currency: "usd",
            recurring: {
                interval:
                    plan.billingCycle === "yearly"
                        ? "year"
                        : plan.billingCycle === "weekly"
                          ? "week"
                          : "month",
            },
            product: product.id,
            metadata: {
                planId: plan._id.toString(),
            },
        });

        // Update plan with Stripe IDs
        await SuperAdminPlans.findByIdAndUpdate(plan._id, {
            stripeProductId: product.id,
            stripePriceId: price.id,
        });

        return { productId: product.id, priceId: price.id };
    } catch (error) {
        console.error("Error creating Stripe product/price:", error);
        throw error;
    }
};

const createSubscription = async (req, res) => {
    try {
        const { planId, paymentMethodId, customerDetails, agreementAccepted } =
            req.body;
        const userId = req.user._id;

        // RESTRICTING TO COMPANIES ONLY !!
        if (req.user.role !== ROLES.COMPANY) {
            return res.status(403).json({
                success: false,
                message:
                    "Only companies can purchase subscriptions. Users inherit their company's plan.",
            });
        }

        // Checking if plan exists and is active
        const plan = await SuperAdminPlans.findOne({
            _id: planId,
            isActive: true,
        });
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found or inactive",
            });
        }

        // Checking if company already has an active subscription
        const existingSubscription = await Subscription.findOne({
            userId,
            status: { $in: ["active", "trial"] },
            isActive: true,
        });

        if (existingSubscription) {
            return res.status(400).json({
                success: false,
                message: "Company already has an active subscription",
            });
        }

        // Create Stripe product/price if not exists (for dev mode)
        if (!plan.stripePriceId && plan.price > 0) {
            console.log("Creating Stripe product/price for plan:", plan.name);
            await createStripeProductAndPrice(plan);
            // Refetch plan with updated Stripe IDs
            const updatedPlan = await SuperAdminPlans.findById(planId);
            Object.assign(plan, updatedPlan.toObject());
        }

        // Creating or retrieve Stripe customer
        let stripeCustomerId = req.user.stripeCustomerId;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: customerDetails?.email || req.user.email,
                name:
                    customerDetails?.name ||
                    req.user.companyName ||
                    req.user.name,
                address: customerDetails?.billingAddress
                    ? {
                          line1: customerDetails.billingAddress.line1,
                          city: customerDetails.billingAddress.city,
                          state: customerDetails.billingAddress.state,
                          postal_code:
                              customerDetails.billingAddress.postal_code,
                          country:
                              customerDetails.billingAddress.country || "US",
                      }
                    : undefined,
                metadata: {
                    userId: userId.toString(),
                    companyName: req.user.companyName || req.user.name,
                },
            });
            stripeCustomerId = customer.id;

            // Update company with stripe customer ID
            await User.findByIdAndUpdate(userId, { stripeCustomerId });
        }

        let subscription;
        let subscriptionStatus = "trial";
        const isTrialPlan = plan.trialDays > 0;

        // FOR DEV MODE: Handle both trial and paid subscriptions
        if (plan.trialDays > 0) {
            // TRIAL SUBSCRIPTION
            console.log("Creating trial subscription for plan:", plan.name);

            const now = new Date();
            const trialEndDate = new Date(
                now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000
            );

            // Calculate end date based on billing cycle
            let endDate;
            switch (plan.billingCycle) {
                case "monthly":
                    endDate = new Date(
                        trialEndDate.getTime() + 30 * 24 * 60 * 60 * 1000
                    );
                    break;
                case "yearly":
                    endDate = new Date(
                        trialEndDate.getTime() + 365 * 24 * 60 * 60 * 1000
                    );
                    break;
                case "weekly":
                    endDate = new Date(
                        trialEndDate.getTime() + 7 * 24 * 60 * 60 * 1000
                    );
                    break;
                default:
                    endDate = trialEndDate;
            }

            // Create Stripe subscription with trial (if price exists)
            let stripeSubscription = null;
            if (plan.stripePriceId) {
                stripeSubscription = await stripe.subscriptions.create({
                    customer: stripeCustomerId,
                    items: [{ price: plan.stripePriceId }],
                    trial_period_days: plan.trialDays,
                    default_payment_method: paymentMethodId || undefined,
                    metadata: {
                        planId: planId.toString(),
                        userId: userId.toString(),
                        companyName: req.user.companyName || req.user.name,
                    },
                });
            }

            subscription = new Subscription({
                userId,
                planId,
                status: "trial",
                amount: plan.price,
                stripeCustomerId,
                stripeSubscriptionId: stripeSubscription?.id,
                trialEndDate,
                endDate,
                paymentMethod: "stripe",
                metadata: {
                    customerDetails,
                    agreementAccepted,
                    stripePaymentMethodId: paymentMethodId,
                },
                limits: plan.limits || {},
            });
        } else if (plan.price === 0) {
            // FREE PLAN
            console.log("Creating free subscription for plan:", plan.name);

            subscription = new Subscription({
                userId,
                planId,
                status: "active",
                amount: 0,
                stripeCustomerId,
                paymentMethod: "manual",
                metadata: {
                    customerDetails,
                    agreementAccepted,
                },
                limits: plan.limits || {},
            });
            subscriptionStatus = "active";
        } else {
            // PAID SUBSCRIPTION (DEV MODE - IMMEDIATE ACTIVATION)
            console.log("Creating paid subscription for plan:", plan.name);

            if (!paymentMethodId) {
                return res.status(400).json({
                    success: false,
                    message: "Payment method is required for paid plans",
                });
            }

            // Attach payment method to customer
            await stripe.paymentMethods.attach(paymentMethodId, {
                customer: stripeCustomerId,
            });

            // Set as default payment method
            await stripe.customers.update(stripeCustomerId, {
                invoice_settings: {
                    default_payment_method: paymentMethodId,
                },
            });

            // Create Stripe subscription
            const stripeSubscription = await stripe.subscriptions.create({
                customer: stripeCustomerId,
                items: [{ price: plan.stripePriceId }],
                default_payment_method: paymentMethodId,
                expand: ["latest_invoice.payment_intent"],
                metadata: {
                    planId: planId.toString(),
                    userId: userId.toString(),
                    companyName: req.user.companyName || req.user.name,
                },
            });

            // DEV MODE: Check payment status and handle immediately
            const paymentIntent =
                stripeSubscription.latest_invoice.payment_intent;
            console.log("Payment Intent Status:", paymentIntent.status);

            if (paymentIntent.status === "requires_action") {
                // Payment requires 3D Secure confirmation
                return res.status(200).json({
                    success: true,
                    message: "Payment confirmation required",
                    data: {
                        subscriptionId: stripeSubscription.id,
                        clientSecret: paymentIntent.client_secret,
                        status: "requires_confirmation",
                    },
                });
            } else if (paymentIntent.status === "succeeded") {
                subscriptionStatus = "active";
                console.log("Payment succeeded immediately");
            } else {
                return res.status(400).json({
                    success: false,
                    message: "Payment failed",
                    error: `Payment status: ${paymentIntent.status}`,
                });
            }

            subscription = new Subscription({
                userId,
                planId,
                status: subscriptionStatus,
                amount: plan.price,
                stripeCustomerId,
                stripeSubscriptionId: stripeSubscription.id,
                paymentMethod: "stripe",
                metadata: {
                    customerDetails,
                    agreementAccepted,
                    stripePaymentMethodId: paymentMethodId,
                },
                limits: plan.limits || {},
            });
        }

        // Save subscription
        await subscription.save();
        await subscription.populate("planId");

        // Update company's current plan information
        await User.findByIdAndUpdate(userId, {
            currentPlan: planId,
            currentSubscription: subscription._id,
            planStatus: subscriptionStatus,
        });

        console.log(`Subscription created successfully:`, {
            subscriptionId: subscription._id,
            planName: plan.name,
            status: subscriptionStatus,
            amount: plan.price,
            isTrialPlan,
        });

        // Send notifications (simplified for dev)
        try {
            console.log("Sending notifications...");

            // Basic notification to company
            if (
                NotificationService &&
                typeof NotificationService.createNotification === "function"
            ) {
                await NotificationService.createNotification({
                    recipient: userId,
                    companyId: userId,
                    type: "SUBSCRIPTION_CREATED",
                    title: `${isTrialPlan ? "Trial" : "Subscription"} Started! 🎉`,
                    message: `Your ${plan.name} ${isTrialPlan ? "trial" : "subscription"} is now active. Welcome aboard!`,
                    priority: "high",
                });
            }
        } catch (notificationError) {
            console.error("Notification error:", notificationError);
        }

        res.status(201).json({
            success: true,
            message: `Company ${isTrialPlan ? "trial" : "subscription"} created successfully`,
            data: {
                subscription,
                planDetails: {
                    name: plan.name,
                    price: plan.price,
                    billingCycle: plan.billingCycle,
                    trialDays: plan.trialDays,
                },
                devMode: true,
                webhooksDisabled: true,
            },
        });
    } catch (error) {
        console.error("Subscription creation error:", error);

        // Handling specific Stripe errors
        if (error.type === "StripeCardError") {
            return res.status(400).json({
                success: false,
                message: "Card was declined",
                error: error.message,
            });
        } else if (error.type === "StripeInvalidRequestError") {
            return res.status(400).json({
                success: false,
                message: "Invalid request to payment processor",
                error: error.message,
            });
        }

        res.status(500).json({
            success: false,
            message: "Server Error",
            error:
                process.env.NODE_ENV === "development"
                    ? error.message
                    : "Internal server error",
        });
    }
};

const getCurrentSubscription = async (req, res) => {
    try {
        let targetUserId = req.user._id;

        // If user is a regular user, get their company's subscription
        if (req.user.role === ROLES.USER) {
            if (!req.user.companyId) {
                return res.status(404).json({
                    success: false,
                    message: "User is not associated with any company",
                });
            }
            targetUserId = req.user.companyId;
        }

        const subscription = await Subscription.findOne({
            userId: targetUserId,
            status: { $in: ["active", "trial"] },
            isActive: true,
        }).populate("planId");

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message:
                    req.user.role === ROLES.COMPANY
                        ? "No active subscription found"
                        : "Your company has no active subscription",
            });
        }

        res.json({
            success: true,
            data: subscription,
            message:
                req.user.role === ROLES.USER
                    ? "Showing your company's subscription details"
                    : "Showing your subscription details",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getSubscriptionHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        let targetUserId = req.user._id;

        // If user is a regular user, get their company's subscription history
        if (req.user.role === ROLES.USER) {
            if (!req.user.companyId) {
                return res.status(404).json({
                    success: false,
                    message: "User is not associated with any company",
                });
            }
            targetUserId = req.user.companyId;
        }

        const subscriptions = await Subscription.find({ userId: targetUserId })
            .populate("planId")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Subscription.countDocuments({
            userId: targetUserId,
        });

        res.json({
            success: true,
            data: subscriptions,
            message:
                req.user.role === ROLES.USER
                    ? "Showing your company's subscription history"
                    : "Showing your subscription history",
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const cancelSubscription = async (req, res) => {
    try {
        // RESTRICT TO COMPANIES ONLY
        if (req.user.role !== ROLES.COMPANY) {
            return res.status(403).json({
                success: false,
                message: "Only company administrators can cancel subscriptions",
            });
        }

        const subscription = await Subscription.findOne({
            _id: req.params.id,
            userId: req.user._id,
        }).populate("planId");

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        if (subscription.status === "canceled") {
            return res.status(400).json({
                success: false,
                message: "Subscription already canceled",
            });
        }

        // Cancel in Stripe if it's a paid subscription
        if (subscription.stripeSubscriptionId) {
            await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    cancel_at_period_end: true,
                }
            );
        }

        const planName = subscription.planId.name;
        const cancellationReason =
            req.body.reason || "Company requested cancellation";

        // Cancel subscription
        await subscription.cancel(cancellationReason);

        // Update company's plan status
        await User.findByIdAndUpdate(req.user._id, {
            planStatus: "canceled",
            currentSubscription: null,
        });

        // Send cancellation notifications
        try {
            // Notify company admin
            await NotificationService.notifySubscriptionCancelled(
                req.user._id,
                req.user._id,
                planName,
                cancellationReason
            );

            // Notify all users in the company about plan cancellation
            const companyUsers = await User.find({
                companyId: req.user._id,
                role: ROLES.USER,
                isActive: true,
            });

            for (const user of companyUsers) {
                await NotificationService.createNotification({
                    recipient: user._id,
                    companyId: req.user._id,
                    type: "COMPANY_PLAN_UPDATE",
                    title: "Company Plan Cancelled ⚠️",
                    message: `Your company has cancelled the ${planName} subscription. Some features may be limited.`,
                    priority: "high",
                    actionButton: {
                        text: "Contact Admin",
                        action: "CONTACT_ADMIN",
                    },
                });
            }

            // Notify super admins about subscription cancellation
            const superAdmins = await User.find({ role: "superadmin" });
            for (const admin of superAdmins) {
                await NotificationService.notifyAdminOfSubscriptionActivity(
                    admin._id,
                    "cancelled",
                    req.user.companyName || req.user.name,
                    planName
                );
            }
        } catch (notificationError) {
            console.error("Notification error:", notificationError);
        }

        res.json({
            success: true,
            message: "Company subscription canceled successfully",
            data: subscription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const changePlan = async (req, res) => {
    try {
        const { newPlanId } = req.body;

        // RESTRICT TO COMPANIES ONLY
        if (req.user.role !== ROLES.COMPANY) {
            return res.status(403).json({
                success: false,
                message:
                    "Only company administrators can change subscription plans",
            });
        }

        const subscription = await Subscription.findOne({
            _id: req.params.id,
            userId: req.user._id,
        }).populate("planId");

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        const oldPlanName = subscription.planId.name;

        const newPlan = await SuperAdminPlans.findOne({
            _id: newPlanId,
            isActive: true,
        });
        if (!newPlan) {
            return res.status(404).json({
                success: false,
                message: "New plan not found or inactive",
            });
        }

        // Update subscription in Stripe
        if (subscription.stripeSubscriptionId) {
            const stripeSubscription = await stripe.subscriptions.retrieve(
                subscription.stripeSubscriptionId
            );

            await stripe.subscriptions.update(
                subscription.stripeSubscriptionId,
                {
                    items: [
                        {
                            id: stripeSubscription.items.data[0].id,
                            price: newPlan.stripePriceId,
                        },
                    ],
                    proration_behavior: "create_prorations",
                }
            );
        }

        // Update subscription
        subscription.planId = newPlanId;
        subscription.amount = newPlan.price;
        await subscription.save();
        await subscription.populate("planId");

        // Update company's current plan
        await User.findByIdAndUpdate(req.user._id, {
            currentPlan: newPlanId,
        });

        // Send plan change notifications
        try {
            // Notify company admin
            await NotificationService.notifyPlanChanged(
                req.user._id,
                req.user._id,
                oldPlanName,
                newPlan.name
            );

            // Notify all users in the company about plan change
            const companyUsers = await User.find({
                companyId: req.user._id,
                role: ROLES.USER,
                isActive: true,
            });

            for (const user of companyUsers) {
                await NotificationService.createNotification({
                    recipient: user._id,
                    companyId: req.user._id,
                    type: "COMPANY_PLAN_UPDATE",
                    title: "Company Plan Updated! 🔄",
                    message: `Your company has changed from ${oldPlanName} to ${newPlan.name}. Check out the new features!`,
                    priority: "medium",
                    actionButton: {
                        text: "View New Features",
                        action: "VIEW_PLAN_FEATURES",
                    },
                });
            }

            // Notify super admins about plan change
            const superAdmins = await User.find({ role: "superadmin" });
            for (const admin of superAdmins) {
                await NotificationService.notifyAdminOfSubscriptionActivity(
                    admin._id,
                    "changed",
                    req.user.companyName || req.user.name,
                    newPlan.name
                );
            }
        } catch (notificationError) {
            console.error("Notification error:", notificationError);
        }

        res.json({
            success: true,
            message: "Company plan changed successfully",
            data: subscription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getAllSubscriptions = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, planId, isActive } = req.query;

        const query = {};
        if (status) query.status = status;
        if (planId) query.planId = planId;
        if (isActive !== undefined) query.isActive = isActive === "true";

        const subscriptions = await Subscription.find(query)
            .populate({
                path: "userId",
                select: "name email planStatus companyName role",
                match: { role: ROLES.COMPANY }, // Only show company subscriptions
            })
            .populate("planId", "name price billingCycle")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        // Filter out null userId entries (from users who aren't companies)
        const filteredSubscriptions = subscriptions.filter((sub) => sub.userId);

        const total = await Subscription.countDocuments({
            ...query,
            userId: {
                $in: await User.find({ role: ROLES.COMPANY }).distinct("_id"),
            },
        });

        res.json({
            success: true,
            data: filteredSubscriptions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getSubscriptionAnalytics = async (req, res) => {
    try {
        const companyIds = await User.find({ role: ROLES.COMPANY }).distinct(
            "_id"
        );

        const [
            totalSubscriptions,
            activeSubscriptions,
            trialSubscriptions,
            canceledSubscriptions,
            monthlyRevenue,
            planDistribution,
            companyPlanStats,
        ] = await Promise.all([
            Subscription.countDocuments({ userId: { $in: companyIds } }),
            Subscription.countDocuments({
                userId: { $in: companyIds },
                status: "active",
                isActive: true,
            }),
            Subscription.countDocuments({
                userId: { $in: companyIds },
                status: "trial",
                isActive: true,
            }),
            Subscription.countDocuments({
                userId: { $in: companyIds },
                status: "canceled",
            }),
            Subscription.aggregate([
                {
                    $match: {
                        userId: { $in: companyIds },
                        status: "active",
                        isActive: true,
                    },
                },
                { $group: { _id: null, total: { $sum: "$amount" } } },
            ]),
            Subscription.aggregate([
                {
                    $match: {
                        userId: { $in: companyIds },
                        status: { $in: ["active", "trial"] },
                        isActive: true,
                    },
                },
                {
                    $lookup: {
                        from: "superadminplans",
                        localField: "planId",
                        foreignField: "_id",
                        as: "plan",
                    },
                },
                { $unwind: "$plan" },
                {
                    $group: {
                        _id: "$plan.name",
                        count: { $sum: 1 },
                        revenue: { $sum: "$amount" },
                    },
                },
            ]),
            User.aggregate([
                {
                    $match: { role: ROLES.COMPANY },
                },
                {
                    $group: {
                        _id: "$planStatus",
                        count: { $sum: 1 },
                    },
                },
            ]),
        ]);

        res.json({
            success: true,
            data: {
                totalSubscriptions,
                activeSubscriptions,
                trialSubscriptions,
                canceledSubscriptions,
                monthlyRevenue: monthlyRevenue[0]?.total || 0,
                planDistribution,
                companyPlanStats,
                note: "Analytics show company subscriptions only. Individual users inherit their company's plan.",
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const toggleSubscriptionStatus = async (req, res) => {
    try {
        const subscription = await Subscription.findById(req.params.id)
            .populate({
                path: "userId",
                select: "name email companyName role",
                match: { role: ROLES.COMPANY },
            })
            .populate("planId", "name");

        if (!subscription || !subscription.userId) {
            return res.status(404).json({
                success: false,
                message: "Company subscription not found",
            });
        }

        await subscription.toggleStatus();

        // Update company's plan status accordingly
        const newStatus = subscription.isActive ? "active" : "canceled";
        await User.findByIdAndUpdate(subscription.userId._id, {
            planStatus: newStatus,
        });

        // Send notification to company and its users about status change
        try {
            const title = subscription.isActive
                ? "Subscription Reactivated! 🎉"
                : "Subscription Suspended ⚠️";

            const message = subscription.isActive
                ? `Your ${subscription.planId.name} subscription has been reactivated. Welcome back!`
                : `Your ${subscription.planId.name} subscription has been suspended. Contact support for assistance.`;

            // Notify company admin
            await NotificationService.createNotification({
                recipient: subscription.userId._id,
                companyId: subscription.userId._id,
                type: subscription.isActive
                    ? "SUBSCRIPTION_ACTIVATED"
                    : "SYSTEM_UPDATE",
                title,
                message,
                priority: "high",
                actionButton: {
                    text: subscription.isActive
                        ? "View Dashboard"
                        : "Contact Support",
                    action: subscription.isActive
                        ? "VIEW_DASHBOARD"
                        : "CONTACT_SUPPORT",
                },
            });

            // Notify all users in the company
            const companyUsers = await User.find({
                companyId: subscription.userId._id,
                role: ROLES.USER,
                isActive: true,
            });

            for (const user of companyUsers) {
                await NotificationService.createNotification({
                    recipient: user._id,
                    companyId: subscription.userId._id,
                    type: subscription.isActive
                        ? "SUBSCRIPTION_ACTIVATED"
                        : "SYSTEM_UPDATE",
                    title,
                    message: subscription.isActive
                        ? `Your company's ${subscription.planId.name} subscription has been reactivated!`
                        : `Your company's ${subscription.planId.name} subscription has been suspended. Contact your administrator.`,
                    priority: "high",
                });
            }
        } catch (notificationError) {
            console.error("Notification error:", notificationError);
        }

        res.json({
            success: true,
            message: `Company subscription ${subscription.isActive ? "activated" : "deactivated"} successfully`,
            data: subscription,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const checkExpiringTrials = async (req, res) => {
    try {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const oneDayFromNow = new Date();
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);
        const companyIds = await User.find({ role: ROLES.COMPANY }).distinct(
            "_id"
        );

        // Find trials expiring in 3 days or 1 day
        const expiringTrials = await Subscription.find({
            userId: { $in: companyIds },
            status: "trial",
            isActive: true,
            trialEndDate: {
                $gte: oneDayFromNow,
                $lte: threeDaysFromNow,
            },
        })
            .populate({
                path: "userId",
                select: "name email companyName",
                match: { role: ROLES.COMPANY },
            })
            .populate("planId", "name");

        // Filter out null userId entries
        const validExpiringTrials = expiringTrials.filter(
            (trial) => trial.userId
        );

        // Send notifications for expiring trials
        const notifications = [];
        for (const trial of validExpiringTrials) {
            const daysLeft = Math.ceil(
                (trial.trialEndDate - new Date()) / (1000 * 60 * 60 * 24)
            );

            notifications.push(
                NotificationService.notifyTrialExpiring(
                    trial.userId._id,
                    trial.userId._id,
                    daysLeft,
                    trial.planId.name
                )
            );
        }

        await Promise.all(notifications);

        res.json({
            success: true,
            message: `Processed ${validExpiringTrials.length} expiring company trials`,
            data: {
                count: validExpiringTrials.length,
                trials: validExpiringTrials,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

// FURTHER ADDED
const confirmSubscriptionPayment = async (req, res) => {
    try {
        const { subscriptionId, paymentIntentId } = req.body;

        // Retrieve the payment intent from Stripe
        const paymentIntent =
            await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status === "succeeded") {
            // Update subscription status
            const subscription = await Subscription.findOne({
                stripeSubscriptionId: subscriptionId,
                userId: req.user._id,
            }).populate("planId");

            if (!subscription) {
                return res.status(404).json({
                    success: false,
                    message: "Subscription not found",
                });
            }

            subscription.status = "active";
            await subscription.save();

            // Update company's plan status
            await User.findByIdAndUpdate(req.user._id, {
                planStatus: "active",
            });

            res.json({
                success: true,
                message: "Payment confirmed and subscription activated",
                data: subscription,
            });
        } else {
            res.status(400).json({
                success: false,
                message: "Payment confirmation failed",
                error: `Payment status: ${paymentIntent.status}`,
            });
        }
    } catch (error) {
        console.error("Payment confirmation error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const handleStripeWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"];
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        console.error("Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case "invoice.payment_succeeded":
                await handleInvoicePaymentSucceeded(event.data.object);
                break;
            case "invoice.payment_failed":
                await handleInvoicePaymentFailed(event.data.object);
                break;
            case "customer.subscription.updated":
                await handleSubscriptionUpdated(event.data.object);
                break;
            case "customer.subscription.deleted":
                await handleSubscriptionDeleted(event.data.object);
                break;
            case "customer.subscription.trial_will_end":
                await handleTrialWillEnd(event.data.object);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error("Webhook handler error:", error);
        res.status(500).json({ error: "Webhook handler failed" });
    }
};

// Webhook helper functions
const handleInvoicePaymentSucceeded = async (invoice) => {
    if (invoice.subscription) {
        const subscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription,
        }).populate("userId planId");

        if (subscription) {
            subscription.status = "active";
            await subscription.save();

            // Update company status
            await User.findByIdAndUpdate(subscription.userId._id, {
                planStatus: "active",
            });

            // Send success notification
            await NotificationService.createNotification({
                recipient: subscription.userId._id,
                companyId: subscription.userId._id,
                type: "PAYMENT_SUCCESS",
                title: "Payment Successful! 🎉",
                message: `Your payment for the ${subscription.planId.name} plan has been processed successfully.`,
                priority: "medium",
            });
        }
    }
};

const handleInvoicePaymentFailed = async (invoice) => {
    if (invoice.subscription) {
        const subscription = await Subscription.findOne({
            stripeSubscriptionId: invoice.subscription,
        }).populate("userId planId");

        if (subscription) {
            subscription.status = "past_due";
            await subscription.save();

            // Update company status
            await User.findByIdAndUpdate(subscription.userId._id, {
                planStatus: "past_due",
            });

            // Send failure notification
            await NotificationService.createNotification({
                recipient: subscription.userId._id,
                companyId: subscription.userId._id,
                type: "PAYMENT_FAILED",
                title: "Payment Failed ⚠️",
                message: `Payment for your ${subscription.planId.name} subscription failed. Please update your payment method.`,
                priority: "high",
                actionButton: {
                    text: "Update Payment",
                    action: "UPDATE_PAYMENT_METHOD",
                },
            });
        }
    }
};

const handleSubscriptionUpdated = async (stripeSubscription) => {
    const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
    });

    if (subscription) {
        // Update subscription status based on Stripe status
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
        }

        subscription.status = newStatus;
        await subscription.save();

        // Update company status
        await User.findByIdAndUpdate(subscription.userId, {
            planStatus: newStatus,
        });
    }
};

const handleSubscriptionDeleted = async (stripeSubscription) => {
    const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
    }).populate("userId planId");

    if (subscription) {
        subscription.status = "canceled";
        subscription.canceledAt = new Date();
        await subscription.save();

        // Update company status
        await User.findByIdAndUpdate(subscription.userId._id, {
            planStatus: "canceled",
            currentSubscription: null,
        });

        // Send cancellation notification
        await NotificationService.createNotification({
            recipient: subscription.userId._id,
            companyId: subscription.userId._id,
            type: "SUBSCRIPTION_CANCELLED",
            title: "Subscription Cancelled",
            message: `Your ${subscription.planId.name} subscription has been cancelled.`,
            priority: "high",
        });
    }
};

const handleTrialWillEnd = async (stripeSubscription) => {
    const subscription = await Subscription.findOne({
        stripeSubscriptionId: stripeSubscription.id,
    }).populate("userId planId");

    if (subscription) {
        const daysLeft = Math.ceil(
            (subscription.trialEndDate - new Date()) / (1000 * 60 * 60 * 24)
        );

        // Send trial ending notification
        await NotificationService.notifyTrialExpiring(
            subscription.userId._id,
            subscription.userId._id,
            daysLeft,
            subscription.planId.name
        );
    }
};

// FURTHER ADDED

// DEV MODE: Manual subscription status update (simulates webhook)
const updateSubscriptionStatus = async (req, res) => {
    try {
        const { subscriptionId, status, reason } = req.body;

        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            userId: req.user._id,
        }).populate("planId");

        if (!subscription) {
            return res.status(404).json({
                success: false,
                message: "Subscription not found",
            });
        }

        const oldStatus = subscription.status;
        subscription.status = status;

        if (status === "canceled") {
            subscription.canceledAt = new Date();
            subscription.cancelReason =
                reason || "Manual cancellation in dev mode";
        }

        await subscription.save();

        // Update company status
        await User.findByIdAndUpdate(req.user._id, {
            planStatus: status,
        });

        console.log(`Subscription status updated: ${oldStatus} → ${status}`);

        res.json({
            success: true,
            message: `Subscription status updated from ${oldStatus} to ${status}`,
            data: subscription,
            devMode: true,
        });
    } catch (error) {
        console.error("Status update error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export {
    getSubscriptionAnalytics,
    toggleSubscriptionStatus,
    getAllSubscriptions,
    changePlan,
    cancelSubscription,
    getSubscriptionHistory,
    getCurrentSubscription,
    createSubscription,
    checkExpiringTrials,
    confirmSubscriptionPayment,
    updateSubscriptionStatus,
    createStripeProductAndPrice,

    // FURTHER ADDED
    handleStripeWebhook,
    // handleInvoicePaymentSucceeded,
    // handleInvoicePaymentFailed,
    // handleSubscriptionUpdated,
    // handleSubscriptionDeleted,
    // handleTrialWillEnd,
};
