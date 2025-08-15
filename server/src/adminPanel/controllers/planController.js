import { validationResult } from "express-validator";
import { SuperAdminPlans } from "../model/SuperAdminPlan.js";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const createPlan = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation errors",
                errors: errors.array(),
            });
        }

        const {
            name,
            price,
            billingCycle,
            trialDays,
            isPopular,
            features,
            description,
            limits,
        } = req.body;

        const existingPlan = await SuperAdminPlans.findOne({
            name: name.trim(),
        });
        if (existingPlan) {
            return res.status(400).json({
                success: false,
                message: "Plan with this name already exists",
            });
        }

        if (isPopular) {
            await SuperAdminPlans.updateMany({}, { isPopular: false });
        }

        let stripePriceId = null;

        // Create Stripe Price if this is a paid plan
        if (price > 0) {
            try {
                // First creating a Stripe Product
                const stripeProduct = await stripe.products.create({
                    name: `${name.charAt(0).toUpperCase() + name.slice(1)} Plan`,
                    description: description,
                    metadata: {
                        planName: name,
                        features: JSON.stringify(features),
                    },
                });

                // Then creating a Stripe Price
                let interval = "month";
                if (billingCycle === "yearly") interval = "year";
                if (billingCycle === "weekly") interval = "week";

                const stripePrice = await stripe.prices.create({
                    unit_amount: Math.round(price * 100), // Convert to cents
                    currency: "usd",
                    recurring: {
                        interval: interval,
                    },
                    product: stripeProduct.id,
                    metadata: {
                        planName: name,
                        billingCycle: billingCycle,
                    },
                });

                stripePriceId = stripePrice.id;

                console.log(
                    `✅ Created Stripe Price: ${stripePriceId} for plan: ${name}`
                );
            } catch (stripeError) {
                console.error("Stripe Price creation failed:", stripeError);
                return res.status(400).json({
                    success: false,
                    message: "Failed to create Stripe price",
                    error: stripeError.message,
                });
            }
        }

        const plan = new SuperAdminPlans({
            name,
            price,
            billingCycle,
            trialDays,
            isPopular,
            features,
            description,
            stripePriceId,
            limits: limits || {},
        });

        const savedPlan = await plan.save();

        res.status(201).json({
            success: true,
            message: "Plan created successfully",
            data: savedPlan,
        });
    } catch (error) {
        console.error("Plan creation error:", error);
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getAllPlans = async (req, res) => {
    try {
        const { page = 1, limit = 10, search, isActive } = req.query;

        const query = {};

        // Search functionality
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        // Filtering by active status
        if (isActive !== undefined) {
            query.isActive = isActive === "true";
        }

        const plans = await SuperAdminPlans.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();

        const total = await SuperAdminPlans.countDocuments(query);

        res.json({
            success: true,
            data: plans,
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

const getPlan = async (req, res) => {
    try {
        const plan = await SuperAdminPlans.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

        res.json({
            success: true,
            data: plan,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const updatePlan = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: "Validation errors",
                errors: errors.array(),
            });
        }

        const plan = await SuperAdminPlans.findById(req.params.id);
        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

        if (req.body.name && req.body.name !== plan.name) {
            const existingPlan = await SuperAdminPlans.findOne({
                name: req.body.name.trim(),
                _id: { $ne: req.params.id },
            });
            if (existingPlan) {
                return res.status(400).json({
                    success: false,
                    message: "Plan with this name already exists",
                });
            }
        }

        if (req.body.isPopular) {
            await SuperAdminPlans.updateMany(
                { _id: { $ne: req.params.id } },
                { isPopular: false }
            );
        }

        // Handle Stripe Price update if price or billing cycle changed
        if (
            (req.body.price && req.body.price !== plan.price) ||
            (req.body.billingCycle &&
                req.body.billingCycle !== plan.billingCycle)
        ) {
            try {
                if (req.body.price > 0) {
                    // Create new Stripe Price (can't update existing price) !!
                    let interval = "month";
                    const billingCycle =
                        req.body.billingCycle || plan.billingCycle;
                    if (billingCycle === "yearly") interval = "year";
                    if (billingCycle === "weekly") interval = "week";

                    // Get the product ID from existing price
                    let productId;
                    if (plan.stripePriceId) {
                        const existingPrice = await stripe.prices.retrieve(
                            plan.stripePriceId
                        );
                        productId = existingPrice.product;
                    } else {
                        // Create new product if none exists
                        const stripeProduct = await stripe.products.create({
                            name: `${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)} Plan`,
                            description: plan.description,
                        });
                        productId = stripeProduct.id;
                    }

                    const newStripePrice = await stripe.prices.create({
                        unit_amount: Math.round(
                            (req.body.price || plan.price) * 100
                        ),
                        currency: "usd",
                        recurring: {
                            interval: interval,
                        },
                        product: productId,
                    });

                    req.body.stripePriceId = newStripePrice.id;

                    console.log(
                        `✅ Updated Stripe Price: ${newStripePrice.id} for plan: ${plan.name}`
                    );
                }
            } catch (stripeError) {
                console.error("Stripe Price update failed:", stripeError);
                return res.status(400).json({
                    success: false,
                    message: "Failed to update Stripe price",
                    error: stripeError.message,
                });
            }
        }

        const updatedPlan = await SuperAdminPlans.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: "Plan updated successfully",
            data: updatedPlan,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const deletePlan = async (req, res) => {
    try {
        const plan = await SuperAdminPlans.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

        // Deactivate the Stripe Price instead of deleting (Stripe doesn't allow price deletion) !!
        if (plan.stripePriceId) {
            try {
                await stripe.prices.update(plan.stripePriceId, {
                    active: false,
                });
                console.log(
                    `✅ Deactivated Stripe Price: ${plan.stripePriceId}`
                );
            } catch (stripeError) {
                console.error(
                    "Failed to deactivate Stripe price:",
                    stripeError
                );
                // Continue with plan deletion even if Stripe update fails
            }
        }

        await SuperAdminPlans.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: "Plan deleted successfully",
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const togglePlanStatus = async (req, res) => {
    try {
        const plan = await SuperAdminPlans.findById(req.params.id);

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

        plan.isActive = !plan.isActive;
        await plan.save();

        // Update Stripe Price status
        if (plan.stripePriceId) {
            try {
                await stripe.prices.update(plan.stripePriceId, {
                    active: plan.isActive,
                });
                console.log(
                    `✅ ${plan.isActive ? "Activated" : "Deactivated"} Stripe Price: ${plan.stripePriceId}`
                );
            } catch (stripeError) {
                console.error(
                    "Failed to update Stripe price status:",
                    stripeError
                );
                // Continue even if Stripe update fails
            }
        }

        res.json({
            success: true,
            message: `Plan ${plan.isActive ? "activated" : "deactivated"} successfully`,
            data: plan,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getPublicPlans = async (req, res) => {
    try {
        const plans = await SuperAdminPlans.find({ isActive: true })
            .sort({ createdAt: -1 })
            .select("-__v -stripePriceId");

        res.json({
            success: true,
            data: plans,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

const getPublicPlan = async (req, res) => {
    try {
        const plan = await SuperAdminPlans.findOne({
            _id: req.params.id,
            isActive: true,
        }).select("-__v -stripePriceId");

        if (!plan) {
            return res.status(404).json({
                success: false,
                message: "Plan not found",
            });
        }

        res.json({
            success: true,
            data: plan,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server Error",
            error: error.message,
        });
    }
};

export {
    getAllPlans,
    getPlan,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanStatus,
    getPublicPlans,
    getPublicPlan,
};
