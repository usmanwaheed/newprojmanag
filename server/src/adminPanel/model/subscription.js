/* eslint-disable no-unused-vars */
import mongoose, { Schema } from "mongoose";
import { SuperAdminPlans } from "./SuperAdminPlan.js";
import { ROLES } from "../../config/roles.js";

const subscriptionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
            // Adding validation to ensure only companies can have subscriptions
            validate: {
                validator: async function (value) {
                    const User = mongoose.model("UserInfo");
                    const user = await User.findById(value);
                    return user && user.role === ROLES.COMPANY;
                },
                message: "Only companies can have subscriptions",
            },
        },
        planId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SuperAdminPlan",
            required: true,
        },
        status: {
            type: String,
            enum: [
                "active",
                "canceled",
                "expired",
                "trial",
                "past_due",
                "unpaid",
            ],
            default: "trial",
        },
        startDate: {
            type: Date,
            default: Date.now,
        },
        endDate: {
            type: Date,
            required: true,
        },
        trialEndDate: {
            type: Date,
        },
        nextBillingDate: {
            type: Date,
        },
        amount: {
            type: Number,
            required: true,
        },
        currency: {
            type: String,
            default: "USD",
        },
        paymentMethod: {
            type: String,
            enum: ["stripe", "paypal", "bank_transfer", "manual"],
            default: "stripe",
        },
        stripeSubscriptionId: {
            type: String,
            unique: true,
            sparse: true,
            index: true,
        },
        stripeCustomerId: {
            type: String,
        },
        isAutoRenew: {
            type: Boolean,
            default: true,
        },
        canceledAt: {
            type: Date,
        },
        cancelReason: {
            type: String,
        },
        metadata: {
            type: Object,
            default: {},
        },
        // Company-specific usage tracking
        usage: {
            totalUsers: {
                type: Number,
                default: 0,
                description: "Total number of users in the company",
            },
            activeUsers: {
                type: Number,
                default: 0,
                description: "Number of active users in the company",
            },
            storage: {
                type: Number,
                default: 0, // in bytes
                description: "Total storage used by the company",
            },
            apiCalls: {
                type: Number,
                default: 0,
                description: "Total API calls made by the company",
            },
            pdfUploads: {
                type: Number,
                default: 0,
                description: "Total PDF uploads by company users",
            },
        },
        // Company limits based on plan
        limits: {
            maxUsers: {
                type: Number,
                default: null, // null means unlimited
                description: "Maximum users allowed for this company",
            },
            maxStorage: {
                type: Number,
                default: null, // null means unlimited, in bytes
                description: "Maximum storage allowed for this company",
            },
            maxApiCalls: {
                type: Number,
                default: null, // null means unlimited
                description: "Maximum API calls per month",
            },
        },
        invoices: [
            {
                invoiceId: String,
                amount: Number,
                status: {
                    type: String,
                    enum: ["pending", "paid", "failed", "refunded"],
                },
                paidAt: Date,
                dueDate: Date,
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ planId: 1 });
subscriptionSchema.index({ endDate: 1 });
// subscriptionSchema.index({ stripeSubscriptionId: 1 });

// Virtual for checking if subscription is in trial
subscriptionSchema.virtual("isInTrial").get(function () {
    return (
        this.status === "trial" &&
        this.trialEndDate &&
        new Date() < this.trialEndDate
    );
});

// Virtual for checking if subscription is expired
subscriptionSchema.virtual("isExpired").get(function () {
    return new Date() > this.endDate;
});

// Virtual for days remaining
subscriptionSchema.virtual("daysRemaining").get(function () {
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for trial days remaining
subscriptionSchema.virtual("trialDaysRemaining").get(function () {
    if (!this.trialEndDate) return 0;
    const now = new Date();
    const diffTime = this.trialEndDate - now;
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
});

// Method to check if subscription is active
subscriptionSchema.methods.checkIsActive = function () {
    return this.status === "active" && !this.isExpired && this.isActive;
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = function (reason) {
    this.status = "canceled";
    this.canceledAt = new Date();
    this.cancelReason = reason;
    this.isAutoRenew = false;
    return this.save();
};

// Method to renew subscription
subscriptionSchema.methods.renew = function (duration) {
    this.endDate = new Date(Date.now() + duration);
    this.status = "active";
    return this.save();
};

// Method to toggle subscription status
subscriptionSchema.methods.toggleStatus = function () {
    this.isActive = !this.isActive;
    return this.save();
};

// Method to update usage statistics
subscriptionSchema.methods.updateUsage = async function (usageData) {
    if (usageData.totalUsers !== undefined)
        this.usage.totalUsers = usageData.totalUsers;
    if (usageData.activeUsers !== undefined)
        this.usage.activeUsers = usageData.activeUsers;
    if (usageData.storage !== undefined) this.usage.storage = usageData.storage;
    if (usageData.apiCalls !== undefined)
        this.usage.apiCalls = usageData.apiCalls;
    if (usageData.pdfUploads !== undefined)
        this.usage.pdfUploads = usageData.pdfUploads;

    return this.save();
};

// Method to check if company has exceeded limits
subscriptionSchema.methods.checkLimits = function () {
    const violations = [];

    if (this.limits.maxUsers && this.usage.totalUsers > this.limits.maxUsers) {
        violations.push({
            type: "users",
            current: this.usage.totalUsers,
            limit: this.limits.maxUsers,
        });
    }

    if (this.limits.maxStorage && this.usage.storage > this.limits.maxStorage) {
        violations.push({
            type: "storage",
            current: this.usage.storage,
            limit: this.limits.maxStorage,
        });
    }

    if (
        this.limits.maxApiCalls &&
        this.usage.apiCalls > this.limits.maxApiCalls
    ) {
        violations.push({
            type: "apiCalls",
            current: this.usage.apiCalls,
            limit: this.limits.maxApiCalls,
        });
    }

    return violations;
};

// Static method to get active company subscriptions
subscriptionSchema.statics.getActiveSubscriptions = function () {
    return this.find({
        status: "active",
        endDate: { $gt: new Date() },
        isActive: true,
    }).populate("userId planId");
};

// Static method to get expiring company subscriptions
subscriptionSchema.statics.getExpiringSubscriptions = function (days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        status: "active",
        endDate: { $lte: futureDate, $gt: new Date() },
        isActive: true,
    }).populate("userId planId");
};

// Static method to get companies with expiring trials
subscriptionSchema.statics.getExpiringTrials = function (days = 3) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return this.find({
        status: "trial",
        trialEndDate: { $lte: futureDate, $gt: new Date() },
        isActive: true,
    }).populate("userId planId");
};

// Static method to get subscription statistics for companies
subscriptionSchema.statics.getCompanySubscriptionStats = async function () {
    const stats = await this.aggregate([
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 },
                totalRevenue: { $sum: "$amount" },
            },
        },
    ]);

    const totalCompanies = await this.distinct("userId").length;

    return {
        totalCompanies,
        statusBreakdown: stats,
    };
};

// Pre-save middleware to calculate end date if not provided
subscriptionSchema.pre("save", async function (next) {
    if (this.isNew && !this.endDate) {
        const plan = await SuperAdminPlans.findById(this.planId);

        if (plan && plan.billingCycle) {
            const now = new Date();
            switch (plan.billingCycle) {
                case "monthly":
                    this.endDate = new Date(now.setMonth(now.getMonth() + 1));
                    break;
                case "yearly":
                    this.endDate = new Date(
                        now.setFullYear(now.getFullYear() + 1)
                    );
                    break;
                case "weekly":
                    this.endDate = new Date(now.setDate(now.getDate() + 7));
                    break;
            }
        }
    }

    // Set trial end date if plan has trial period
    if (this.isNew && this.trialEndDate === undefined) {
        const plan = await SuperAdminPlans.findById(this.planId);
        if (plan && plan.trialDays > 0) {
            const trialEnd = new Date();
            trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
            this.trialEndDate = trialEnd;
            this.status = "trial";
        }
    }

    // Set limits based on plan if this is a new subscription
    if (this.isNew) {
        const plan = await SuperAdminPlans.findById(this.planId);
        if (plan && plan.features) {
            // Extract limits from plan features if they exist
            this.limits.maxUsers = plan.features.maxUsers || null;
            this.limits.maxStorage = plan.features.maxStorage || null;
            this.limits.maxApiCalls = plan.features.maxApiCalls || null;
        }
    }

    next();
});

// Post-save middleware to update company user statuses
subscriptionSchema.post("save", async function (doc) {
    try {
        const User = mongoose.model("UserInfo");

        // If subscription is canceled or expired, deactivate all company users
        if (doc.status === "canceled" || doc.status === "expired") {
            await User.updateMany(
                { companyId: doc.userId },
                {
                    isActive: false,
                    isBlocked: true,
                }
            );
        }
        // If subscription is active, reactivate all company users
        else if (doc.status === "active" && doc.isActive) {
            await User.updateMany(
                { companyId: doc.userId },
                {
                    isActive: true,
                    isBlocked: false,
                }
            );
        }
    } catch (error) {
        console.error("Error updating company users:", error);
    }
});

const Subscription = mongoose.model(
    "SuperAdminSubscription",
    subscriptionSchema
);

export { Subscription };
