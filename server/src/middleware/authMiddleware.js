/* eslint-disable no-undef */
import { User } from "../models/userModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { SuperAdmin } from "../adminPanel/model/superadminModel.js";
import { ROLES } from "../config/roles.js";

// Verify User Middleware
export const verifyUser = (roles = []) =>
    asyncHandler(async (req, res, next) => {
        // Get tokens from cookies or Authorization header
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");
        const adminToken =
            req.cookies?.accessAdminToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        // Check if we have at least one token
        if (!token && !adminToken) {
            throw new apiError(401, "Access token missing");
        }

        try {
            let decodedToken,
                user,
                isAdmin = false;

            // Try admin token first if it exists
            if (adminToken) {
                try {
                    decodedToken = jwt.verify(
                        adminToken,
                        process.env.JWT_SECRET
                    );
                    user = await SuperAdmin.findById(decodedToken._id).select(
                        "-password"
                    );
                    isAdmin = true;
                } catch (adminError) {
                    // If admin token fails, try user token if available
                    if (token) {
                        decodedToken = jwt.verify(
                            token,
                            process.env.JWT_SECRET
                        );
                        user = await User.findById(decodedToken._id).select(
                            "-password"
                        );
                        isAdmin = false;
                    } else {
                        throw adminError;
                    }
                }
            } else if (token) {
                // Only user token available
                decodedToken = jwt.verify(token, process.env.JWT_SECRET);
                user = await User.findById(decodedToken._id).select(
                    "-password"
                );
                isAdmin = false;
            }

            if (!user) {
                throw new apiError(401, "User not found");
            }

            // Additional checks for regular users (not super admins)
            if (!isAdmin) {
                // Check if user is blocked or inactive
                if (user.isBlocked || !user.isActive) {
                    throw new apiError(
                        403,
                        "Your account is inactive. Please contact support."
                    );
                }

                // For company users, check trial status
                if (user.role === ROLES.COMPANY) {
                    await user.checkTrialStatus();
                    if (user.isBlocked || !user.isActive) {
                        throw new apiError(
                            403,
                            "Your company trial has expired. Please purchase a subscription to continue."
                        );
                    }
                }

                // For regular users, check if their company is active
                if (user.role === ROLES.USER && user.companyId) {
                    const company = await User.findById(user.companyId);
                    if (company) {
                        await company.checkTrialStatus();
                        if (company.isBlocked || !company.isActive) {
                            throw new apiError(
                                403,
                                "Your company account is inactive. Please contact your administrator."
                            );
                        }
                    }
                }
            }

            // Role verification
            if (roles.length > 0 && !roles.includes(user.role)) {
                return res
                    .status(403)
                    .json(new apiResponse(403, {}, "Access Denied"));
            }

            // Attach user to request
            req.user = user;
            req.isAdmin = isAdmin;
            next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res
                    .status(401)
                    .json(
                        new apiResponse(
                            401,
                            {},
                            "Access token expired. Please refresh your token."
                        )
                    );
            }
            throw new apiError(401, "Invalid token");
        }
    });

// Middleware specifically for company-only endpoints
export const verifyCompany = () =>
    asyncHandler(async (req, res, next) => {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new apiError(401, "Access token missing");
        }

        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decodedToken._id).select(
                "-password"
            );

            if (!user) {
                throw new apiError(401, "User not found");
            }

            if (user.role !== ROLES.COMPANY) {
                throw new apiError(
                    403,
                    "Access denied. Only companies can access this endpoint."
                );
            }

            // Check trial status
            await user.checkTrialStatus();
            if (user.isBlocked || !user.isActive) {
                throw new apiError(
                    403,
                    "Your company trial has expired. Please purchase a subscription to continue."
                );
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res
                    .status(401)
                    .json(
                        new apiResponse(
                            401,
                            {},
                            "Access token expired. Please refresh your token."
                        )
                    );
            }
            throw new apiError(401, "Invalid token");
        }
    });

// Middleware to check if user belongs to the same company
export const verifyCompanyUser = () =>
    asyncHandler(async (req, res, next) => {
        const token =
            req.cookies?.accessToken ||
            req.header("Authorization")?.replace("Bearer ", "");

        if (!token) {
            throw new apiError(401, "Access token missing");
        }

        try {
            const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decodedToken._id).select(
                "-password"
            );

            if (!user) {
                throw new apiError(401, "User not found");
            }

            // Check if user is blocked or inactive
            if (user.isBlocked || !user.isActive) {
                throw new apiError(
                    403,
                    "Your account is inactive. Please contact support."
                );
            }

            // For company users, check trial status
            if (user.role === ROLES.COMPANY) {
                await user.checkTrialStatus();
                if (user.isBlocked || !user.isActive) {
                    throw new apiError(
                        403,
                        "Your company trial has expired. Please purchase a subscription to continue."
                    );
                }
            }

            // For regular users, check if their company is active
            if (user.role === ROLES.USER && user.companyId) {
                const company = await User.findById(user.companyId);
                if (company) {
                    await company.checkTrialStatus();
                    if (company.isBlocked || !company.isActive) {
                        throw new apiError(
                            403,
                            "Your company account is inactive. Please contact your administrator."
                        );
                    }
                }
            }

            req.user = user;
            next();
        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res
                    .status(401)
                    .json(
                        new apiResponse(
                            401,
                            {},
                            "Access token expired. Please refresh your token."
                        )
                    );
            }
            throw new apiError(401, "Invalid token");
        }
    });
