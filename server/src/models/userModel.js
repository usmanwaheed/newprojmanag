/* eslint-disable no-undef */
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { ROLES } from "../config/roles.js";

const UserSchema = new Schema(
    {
        name: {
            type: String,
            required: [true, "name field is required"],
            unique: true,
            trim: true,
        },
        email: {
            type: String,
            required: [true, "email field is required"],
            unique: true,
            trim: true,
            lowercase: true,
            match: [/\S+@\S+\.\S+/, "please provide a valid email address"],
        },
        password: {
            type: String,
            required: [true, "password field is required"],
        },
        confirmPassword: {
            type: String,
            select: false,
        },
        avatar: {
            type: String,
            default:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQNvWDvQb_rCtRL-p_w329CtzHmfzfWP0FIw&s",
        },
        JoinedOn: {
            type: Date,
            default: Date.now,
        },
        role: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.USER,
        },

        // Company-specific fields
        companyName: {
            type: String,
            required: function () {
                return this.role === ROLES.COMPANY;
            },
        },
        companyLogo: {
            type: String,
            default: null,
        },
        companySpecialKey: {
            type: String,
            unique: true,
            sparse: true, // Only enforce uniqueness for non-null values
            required: function () {
                return this.role === ROLES.COMPANY;
            },
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            default: null,
        },
        userCompanyKey: {
            type: String,
            required: function () {
                return this.role === ROLES.USER;
            },
        },

        // Trial and subscription fields
        trialStartDate: {
            type: Date,
            default: function () {
                return this.role === ROLES.COMPANY ? Date.now() : null;
            },
        },
        trialEndDate: {
            type: Date,
            default: function () {
                return this.role === ROLES.COMPANY
                    ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
                    : null;
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },

        // Updated plan integration (only for companies)
        currentPlan: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SuperAdminPlan",
            default: null,
        },
        planStatus: {
            type: String,
            enum: ["active", "trial", "expired", "canceled", "none"],
            default: function () {
                return this.role === ROLES.COMPANY ? "trial" : "none";
            },
        },

        // Added Stripe customer ID (only for companies)
        stripeCustomerId: {
            type: String,
            sparse: true,
            index: true,
        },

        // Current subscription reference (only for companies)
        currentSubscription: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SuperAdminSubscription",
            default: null,
        },

        requestedAt: {
            type: Date,
            default: Date.now,
        },
        refreshToken: {
            type: String,
        },

        hourlyRate: { type: Number, default: 0 },
        description: { type: String, default: "" },
        slackId: { type: String, default: "" },
        upworkId: { type: String, default: "" },
        linkedinId: { type: String, default: "" },
        facebookId: { type: String, default: "" },
        gender: { type: String, enum: ["Male", "Female"], default: "Male" },
    },
    { timestamps: true }
);

// Indexes for efficient querying
// UserSchema.index({ email: 1 });
// UserSchema.index({ name: 1 });
// UserSchema.index({ currentPlan: 1 });
// UserSchema.index({ stripeCustomerId: 1 });
// UserSchema.index({ companySpecialKey: 1 });
// UserSchema.index({ role: 1 });

//   Virtual to check if user has active subscription
UserSchema.virtual("hasActiveSubscription").get(function () {
    return this.planStatus === "active" || this.planStatus === "trial";
});

//   Virtual to check if trial is expired
UserSchema.virtual("isTrialExpired").get(function () {
    if (this.role !== ROLES.COMPANY) return false;
    return new Date() > this.trialEndDate;
});

//   Virtual to check if company should be blocked
UserSchema.virtual("shouldBeBlocked").get(function () {
    if (this.role !== ROLES.COMPANY) return false;
    return this.isTrialExpired && this.planStatus !== "active";
});

//   Method to update user's current plan
UserSchema.methods.updateCurrentPlan = async function (
    planId,
    subscriptionId,
    status = "active"
) {
    if (this.role !== ROLES.COMPANY) {
        throw new Error("Only companies can have subscription plans");
    }
    this.currentPlan = planId;
    this.currentSubscription = subscriptionId;
    this.planStatus = status;
    this.isActive = true;
    this.isBlocked = false;
    return this.save();
};

//   Method to cancel user's plan
UserSchema.methods.cancelCurrentPlan = async function () {
    if (this.role !== ROLES.COMPANY) {
        throw new Error("Only companies can cancel subscription plans");
    }
    this.planStatus = "canceled";
    this.currentSubscription = null;
    this.isActive = false;
    this.isBlocked = true;
    return this.save();
};

//   Method to check and update trial status
UserSchema.methods.checkTrialStatus = async function () {
    if (this.role !== ROLES.COMPANY) return this;

    if (this.isTrialExpired && this.planStatus !== "active") {
        this.isActive = false;
        this.isBlocked = true;
        this.planStatus = "expired";

        // Also block all users associated with this company
        await User.updateMany(
            { companyId: this._id },
            { isActive: false, isBlocked: true }
        );

        return this.save();
    }
    return this;
};

//   Static method to get users with active plans
UserSchema.statics.getUsersWithActivePlans = function () {
    return this.find({
        planStatus: { $in: ["active", "trial"] },
        currentPlan: { $ne: null },
        role: ROLES.COMPANY,
    }).populate("currentPlan currentSubscription");
};

//   Static method to get company by special key
UserSchema.statics.getCompanyBySpecialKey = function (specialKey) {
    return this.findOne({
        companySpecialKey: specialKey,
        role: ROLES.COMPANY,
    });
};

//   Static method to block expired companies
UserSchema.statics.blockExpiredCompanies = async function () {
    const expiredCompanies = await this.find({
        role: ROLES.COMPANY,
        trialEndDate: { $lt: new Date() },
        planStatus: { $ne: "active" },
    });

    for (const company of expiredCompanies) {
        await company.checkTrialStatus();
    }
};

// Hashing Bcrypt Password
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Confirmation Password
UserSchema.pre("validate", function () {
    if (this.confirmPassword) {
        this.confirmPassword = undefined;
    }
});

// Generate Access Token for Login
UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            name: this.name,
            email: this.email,
            role: this.role,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_JWT_EXPIRY }
    );
};

// Refresh Token Without Login Again
UserSchema.methods.refreshAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const User = mongoose.model("UserInfo", UserSchema);
export { User };
