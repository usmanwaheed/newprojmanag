/* eslint-disable no-undef */
import mongoose, { Schema } from "mongoose";
import { ROLES } from "../../config/roles.js";
import jwt from "jsonwebtoken";

const SuperAdminSchema = new Schema(
    {
        name: {
            type: String,
            // required: [true, "name field is required"],
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
        avatar: {
            type: String,
            default:
                "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQQNvWDvQb_rCtRL-p_w329CtzHmfzfWP0FIw&s",
        },
        role: {
            type: String,
            enum: Object.values(ROLES),
            default: ROLES.SUPERADMIN,
        },
        refreshAdminToken: {
            type: String,
        },
    },
    { timestamps: true }
);

// Generate Access Token for Login
SuperAdminSchema.methods.generateAccessAdminToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            name: this.name,
            email: this.email,
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_JWT_EXPIRY }
    );
};

// Refresh Token Without Login Again
SuperAdminSchema.methods.refreshAccessAdminToken = function () {
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );
};

const SuperAdmin = mongoose.model("SuperAdminLogin", SuperAdminSchema);
export { SuperAdmin };
