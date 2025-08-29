import mongoose, { Schema } from "mongoose";

const planSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            enum: ["basic", "professional", "enterprise"],
            default: "basic",
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        billingCycle: {
            type: String,
            required: true,
            enum: ["monthly", "yearly", "weekly"],
            default: "monthly",
        },
        // Add Stripe Price ID - CRITICAL for Stripe integration
        stripePriceId: {
            type: String,
            required: function () {
                // Only required if this is not a free plan
                return this.price > 0;
            },
            sparse: true, // Allows multiple null values
            validate: {
                validator: function (value) {
                    // If price is 0, stripePriceId is not required
                    if (this.price === 0) return true;
                    // If price > 0, stripePriceId must start with 'price_'
                    return value && value.startsWith("price_");
                },
                message:
                    'Valid Stripe Price ID is required for paid plans (must start with "price_")',
            },
        },
        trialDays: {
            type: Number,
            default: 14,
            min: 0,
        },
        isPopular: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        features: {
            type: [String],
            required: true,
            validate: {
                validator: function (features) {
                    return features.length > 0;
                },
                message: "At least one feature is required",
            },
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 500,
        },
        // Add plan limits for subscription management
        limits: {
            maxUsers: {
                type: Number,
                default: null, // null means unlimited
            },
            maxStorage: {
                type: Number,
                default: null, // in bytes, null means unlimited
            },
            maxApiCalls: {
                type: Number,
                default: null, // per month, null means unlimited
            },
        },
    },
    {
        timestamps: true,
    }
);

planSchema.index({ isActive: 1 });
planSchema.index({ name: 1 });
// planSchema.index({ stripePriceId: 1 });

const SuperAdminPlans = mongoose.model("SuperAdminPlan", planSchema);
export { SuperAdminPlans };
