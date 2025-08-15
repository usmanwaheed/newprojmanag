/* eslint-disable no-undef */
import jwt from "jsonwebtoken";
import { User } from "../models/userModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
// import { NotificationService } from "../services/NotificationService.js";
import crypto from "crypto";
import { NotificationService } from "../utils/notificationService.js";

// Generate a Random CompanyKey for the Company
const generateUniqueCompanyKey = async () => {
    let key, exists;
    do {
        // Generate a 6-character alphanumeric key (customize length as needed)
        key = `COMP_${crypto.randomBytes(3).toString("hex")}`;
        exists = await User.findOne({ companySpecialKey: key });
    } while (exists);
    return key;
};

// Generate Access & Refresh Token of User
const generateAccessTokenAndRefreshToken = async (tokenId) => {
    const user = await User.findById(tokenId);
    if (!user) throw new apiError(404, "User not found");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.refreshAccessToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
};

// To Refresh user Login Access Token
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new apiError(401, "UnAuthorized Request");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const user = await User.findById(decodedToken._id).select("-password");
        if (!user) {
            throw new apiError(401, "Invalid Refresh Token");
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new apiError(401, "Invalid or Expires Refresh Token");
        }

        const options = {
            httpOnly: true,
            secure: "true",
            sameSite: "None",
            maxAge: 12 * 24 * 60 * 60 * 1000,
        };
        const { accessToken, refreshToken } =
            await generateAccessTokenAndRefreshToken(user?._id);

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new apiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access Token Refreshed Successfully"
                )
            );
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            const decodedToken = jwt.decode(incomingRefreshToken);
            if (decodedToken?._id) {
                const user = await User.findById(decodedToken._id);
                if (user) {
                    user.refreshToken = null;
                    await user.save();
                }
            }
            res.clearCookie("accessToken");
            res.clearCookie("refreshToken");
        }
        return res.status(401).json({ message: "Refresh Token Expired" });
    }
});

// To Register a Person (Company or User) - WITH NOTIFICATIONS
const registerUser = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        password,
        role,
        companyName,
        companySpecialKey,
        userCompanyKey,
    } = req.body;

    // Validate required fields based on role
    if (role === ROLES.COMPANY) {
        if (!companyName) {
            return res.status(400).json({
                error: "Company name is required for company registration",
            });
        }
    } else if (role === ROLES.USER) {
        if (!userCompanyKey) {
            return res.status(400).json({
                error: "Company special key is required for user registration",
            });
        }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
        $or: [{ email }, { name }],
    });
    if (existingUser) {
        return res.status(400).json({
            error: "User with given credentials already exists",
        });
    }

    // For user registration, verify company exists and is active
    let companyId = null;
    let company = null;
    if (role === ROLES.USER) {
        company = await User.getCompanyBySpecialKey(userCompanyKey);
        if (!company) {
            return res.status(400).json({
                error: "Invalid company special key",
            });
        }

        // Check if company is active
        await company.checkTrialStatus();
        if (company.isBlocked || !company.isActive) {
            return res.status(400).json({
                error: "Company is not active. Please contact your company administrator.",
            });
        }

        companyId = company._id;
    }
    let companySpecialKeyVar;
    // For company registration, check if special key is unique
    if (role === ROLES.COMPANY) {
        companySpecialKeyVar = await generateUniqueCompanyKey();
    }

    // Create user data object
    const userData = {
        name,
        email,
        password,
        role,
    };

    // Add role-specific fields
    if (role === ROLES.COMPANY) {
        userData.companyName = companyName;
        userData.companySpecialKey = companySpecialKeyVar;
        userData.planStatus = "trial";
        userData.trialStartDate = new Date();
        userData.trialEndDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    } else if (role === ROLES.USER) {
        userData.userCompanyKey = userCompanyKey;
        userData.companyId = companyId;
        userData.planStatus = "none";
    }

    const registeredUser = await User.create(userData);

    const createdUser = await User.findById(registeredUser._id)
        .select("-password -refreshToken")
        .populate("companyId", "companyName companySpecialKey isActive");

    if (!createdUser) {
        return res.status(500).json({
            error: "Something went wrong while registering the user",
        });
    }

    //   SEND NOTIFICATIONS
    try {
        if (role === ROLES.USER && company) {
            // Send welcome notification to the new user
            await NotificationService.notifyUserAddedToCompany(
                createdUser._id,
                companyId,
                companyId // Company admin as the sender
            );
        }
    } catch (notificationError) {
        console.error(
            "Failed to send registration notifications:",
            notificationError
        );
        // Don't fail the registration if notification fails
    }

    return res.status(201).json({
        message: `${role === ROLES.COMPANY ? "Company" : "User"} registered successfully`,
        user: createdUser,
    });
});

// To Login a Person (Company or User) - WITH TRIAL EXPIRY NOTIFICATIONS
const loginUser = asyncHandler(async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if ((!name && !email) || !password || !role) {
        throw new apiError(400, "All fields are required");
    }

    // Find user by either name or email
    const user = await User.findOne({
        $or: [{ name }, { email }],
        role: role, // Ensure role matches
    });

    if (!user) {
        throw new apiError(404, "User not found");
    }

    // Check if the password is correct
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
        throw new apiError(401, "Password is incorrect");
    }

    // For company users, check trial status and send notifications
    if (user.role === ROLES.COMPANY) {
        await user.checkTrialStatus();

        //   CHECK AND SEND TRIAL EXPIRY NOTIFICATIONS
        if (user.planStatus === "trial" && user.trialEndDate) {
            const now = new Date();
            const timeDiff = user.trialEndDate.getTime() - now.getTime();
            const daysLeft = Math.ceil(timeDiff / (1000 * 3600 * 24));

            // Send notification if trial expires in 1, 2, or 3 days
            if (daysLeft > 0 && daysLeft <= 3) {
                try {
                    await NotificationService.notifyTrialExpiring(
                        user._id,
                        daysLeft
                    );
                } catch (notificationError) {
                    console.error(
                        "Failed to send trial expiry notification:",
                        notificationError
                    );
                }
            }
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

    // Check if user is blocked
    if (user.isBlocked || !user.isActive) {
        throw new apiError(
            403,
            "Your account is inactive. Please contact support."
        );
    }

    // Generate access and refresh tokens
    const { accessToken, refreshToken } =
        await generateAccessTokenAndRefreshToken(user._id);

    // Get the user details without password and refreshToken
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")
        .populate("currentPlan", "name price billingCycle features")
        .populate("currentSubscription", "status endDate trialEndDate")
        .populate("companyId", "companyName companySpecialKey isActive");

    // Cookie options
    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 12 * 24 * 60 * 60 * 1000,
    };

    // Send response with cookies
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new apiResponse(
                200,
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "User logged in successfully"
            )
        );
});

// To Logout a Person
const logoutUser = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: true,
    };
    res.clearCookie("accessToken", options);
    res.clearCookie("refreshToken", options);
    return res
        .status(200)
        .json(new apiResponse(200, true, "User logged out successfully"));
});

// To get Logged In user Details
const getUserData = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id)
        .select("-password -refreshToken")
        .populate("currentPlan", "name price billingCycle features description")
        .populate(
            "currentSubscription",
            "status endDate trialEndDate nextBillingDate"
        )
        .populate({
            path: "companyId",
            select: "companyName companySpecialKey isActive companyLogo",
        });

    // Check trial status for companies
    if (user.role === ROLES.COMPANY) {
        await user.checkTrialStatus();
    }

    res.status(200).json(
        new apiResponse(200, user, "User data fetched successfully")
    );
});

// Get user's plan details (only for companies)
const getUserPlanDetails = asyncHandler(async (req, res) => {
    let targetUser = req.user;
    let isViewingCompanyPlan = false;

    // If user is a regular user, get their company's plan details
    if (req.user.role === ROLES.USER) {
        if (!req.user.companyId) {
            return res
                .status(404)
                .json(
                    new apiResponse(
                        404,
                        {},
                        "User is not associated with any company"
                    )
                );
        }

        targetUser = await User.findById(req.user.companyId)
            .select(
                "currentPlan planStatus currentSubscription role trialEndDate companyName"
            )
            .populate("currentPlan")
            .populate("currentSubscription");

        isViewingCompanyPlan = true;

        if (!targetUser) {
            return res
                .status(404)
                .json(new apiResponse(404, {}, "Company not found"));
        }
    } else if (req.user.role === ROLES.COMPANY) {
        targetUser = await User.findById(req.user._id)
            .select(
                "currentPlan planStatus currentSubscription role trialEndDate companyName"
            )
            .populate("currentPlan")
            .populate("currentSubscription");
    } else {
        return res
            .status(403)
            .json(
                new apiResponse(
                    403,
                    {},
                    "Access denied. Only companies and users can view plan details"
                )
            );
    }

    // Check trial status for companies
    if (targetUser.role === ROLES.COMPANY) {
        await targetUser.checkTrialStatus();
    }

    if (!targetUser.currentPlan) {
        return res.status(200).json(
            new apiResponse(
                200,
                {
                    hasPlan: false,
                    planStatus: targetUser.planStatus,
                    trialEndDate: targetUser.trialEndDate,
                    isTrialExpired: targetUser.isTrialExpired,
                    isViewingCompanyPlan,
                    companyName: targetUser.companyName,
                    message: isViewingCompanyPlan
                        ? "Your company has no active plan"
                        : "No active plan found",
                },
                "Plan details fetched successfully"
            )
        );
    }

    res.status(200).json(
        new apiResponse(
            200,
            {
                hasPlan: true,
                planStatus: targetUser.planStatus,
                currentPlan: targetUser.currentPlan,
                currentSubscription: targetUser.currentSubscription,
                hasActiveSubscription: targetUser.hasActiveSubscription,
                trialEndDate: targetUser.trialEndDate,
                isTrialExpired: targetUser.isTrialExpired,
                isViewingCompanyPlan,
                companyName: targetUser.companyName,
                message: isViewingCompanyPlan
                    ? "Showing your company's plan details"
                    : "Showing your plan details",
            },
            "Plan details fetched successfully"
        )
    );
});

// Get company users with plan access status (Company only)
const getCompanyUsersWithPlanStatus = asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.COMPANY) {
        return res
            .status(403)
            .json(
                new apiResponse(
                    403,
                    {},
                    "Only companies can view user plan status"
                )
            );
    }

    const companyUsers = await User.find({
        companyId: req.user._id,
        role: ROLES.USER,
    })
        .select("name email isActive isBlocked avatar JoinedOn")
        .sort({ JoinedOn: -1 });

    const company = await User.findById(req.user._id)
        .select("currentPlan planStatus currentSubscription companyName")
        .populate("currentPlan", "name features")
        .populate("currentSubscription", "status endDate trialEndDate");

    res.status(200).json(
        new apiResponse(
            200,
            {
                companyPlan: company.currentPlan,
                companyPlanStatus: company.planStatus,
                companySubscription: company.currentSubscription,
                totalUsers: companyUsers.length,
                activeUsers: companyUsers.filter((user) => user.isActive)
                    .length,
                blockedUsers: companyUsers.filter((user) => user.isBlocked)
                    .length,
                users: companyUsers,
                message: "All users inherit the company's plan access",
            },
            "Company users with plan status fetched successfully"
        )
    );
});

// Check if user/company can access a specific feature
const checkFeatureAccess = asyncHandler(async (req, res) => {
    const { feature } = req.params;
    let targetUser = req.user;

    // If user is a regular user, check their company's plan
    if (req.user.role === ROLES.USER) {
        if (!req.user.companyId) {
            return res.status(200).json(
                new apiResponse(
                    200,
                    {
                        hasAccess: false,
                        reason: "User is not associated with any company",
                    },
                    "Feature access checked"
                )
            );
        }

        targetUser = await User.findById(req.user.companyId).populate(
            "currentPlan",
            "features"
        );
    } else if (req.user.role === ROLES.COMPANY) {
        targetUser = await User.findById(req.user._id).populate(
            "currentPlan",
            "features"
        );
    }

    // Check if user/company has active plan
    if (!targetUser.currentPlan || !targetUser.hasActiveSubscription) {
        return res.status(200).json(
            new apiResponse(
                200,
                {
                    hasAccess: false,
                    reason:
                        req.user.role === ROLES.USER
                            ? "Your company does not have an active plan"
                            : "No active plan found",
                },
                "Feature access checked"
            )
        );
    }

    // Check if the plan includes the requested feature
    const planFeatures = targetUser.currentPlan.features || {};
    const hasFeature =
        planFeatures[feature] === true ||
        (Array.isArray(planFeatures.included) &&
            planFeatures.included.includes(feature));

    res.status(200).json(
        new apiResponse(
            200,
            {
                hasAccess: hasFeature,
                planName: targetUser.currentPlan.name,
                feature,
                isCompanyPlan: req.user.role === ROLES.USER,
            },
            "Feature access checked"
        )
    );
});

// Get plan usage statistics (Company only)
const getPlanUsageStats = asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.COMPANY) {
        return res
            .status(403)
            .json(
                new apiResponse(
                    403,
                    {},
                    "Only companies can view usage statistics"
                )
            );
    }

    const company = await User.findById(req.user._id)
        .populate("currentSubscription", "usage limits")
        .populate("currentPlan", "name features");

    if (!company.currentSubscription) {
        return res
            .status(404)
            .json(new apiResponse(404, {}, "No active subscription found"));
    }

    // Get current usage data
    const totalUsers = await User.countDocuments({ companyId: req.user._id });
    const activeUsers = await User.countDocuments({
        companyId: req.user._id,
        isActive: true,
    });

    // Update subscription usage
    await company.currentSubscription.updateUsage({
        totalUsers,
        activeUsers,
    });

    // Check for limit violations
    const limitViolations = company.currentSubscription.checkLimits();

    res.status(200).json(
        new apiResponse(
            200,
            {
                planName: company.currentPlan.name,
                usage: company.currentSubscription.usage,
                limits: company.currentSubscription.limits,
                limitViolations,
                isOverLimit: limitViolations.length > 0,
                utilizationPercentage: {
                    users: company.currentSubscription.limits.maxUsers
                        ? (totalUsers /
                              company.currentSubscription.limits.maxUsers) *
                          100
                        : 0,
                    storage: company.currentSubscription.limits.maxStorage
                        ? (company.currentSubscription.usage.storage /
                              company.currentSubscription.limits.maxStorage) *
                          100
                        : 0,
                },
            },
            "Plan usage statistics fetched successfully"
        )
    );
});

// Middleware to check plan access for protected routes
const requireActivePlan = (requiredFeature = null) => {
    return asyncHandler(async (req, res, next) => {
        let targetUser = req.user;

        // If user is a regular user, check their company's plan
        if (req.user.role === ROLES.USER) {
            if (!req.user.companyId) {
                return res
                    .status(403)
                    .json(
                        new apiResponse(
                            403,
                            {},
                            "Access denied: User is not associated with any company"
                        )
                    );
            }

            targetUser = await User.findById(req.user.companyId).populate(
                "currentPlan",
                "features"
            );

            if (!targetUser) {
                return res
                    .status(403)
                    .json(
                        new apiResponse(
                            403,
                            {},
                            "Access denied: Company not found"
                        )
                    );
            }
        } else if (req.user.role === ROLES.COMPANY) {
            targetUser = await User.findById(req.user._id).populate(
                "currentPlan",
                "features"
            );
        }

        // Check if user/company has active plan
        if (!targetUser.hasActiveSubscription) {
            return res
                .status(403)
                .json(
                    new apiResponse(
                        403,
                        {},
                        req.user.role === ROLES.USER
                            ? "Access denied: Your company does not have an active plan"
                            : "Access denied: No active plan found"
                    )
                );
        }

        // Check specific feature if required
        if (requiredFeature && targetUser.currentPlan) {
            const planFeatures = targetUser.currentPlan.features || {};
            const hasFeature =
                planFeatures[requiredFeature] === true ||
                (Array.isArray(planFeatures.included) &&
                    planFeatures.included.includes(requiredFeature));

            if (!hasFeature) {
                return res
                    .status(403)
                    .json(
                        new apiResponse(
                            403,
                            {},
                            `Access denied: ${requiredFeature} feature not available in your plan`
                        )
                    );
            }
        }

        // Add plan info to request for use in route handlers
        req.planInfo = {
            plan: targetUser.currentPlan,
            isCompanyPlan: req.user.role === ROLES.USER,
            companyId:
                req.user.role === ROLES.USER
                    ? req.user.companyId
                    : req.user._id,
        };

        next();
    });
};

// Get Data of All Users (with company info)
const getAllData = asyncHandler(async (req, res) => {
    const data = await User.find()
        .select("-password -refreshToken")
        .populate("currentPlan", "name price billingCycle")
        .populate("currentSubscription", "status endDate")
        .populate("companyId", "companyName companySpecialKey");

    if (data.length === 0) {
        throw new apiError(404, "No users found");
    }
    return res
        .status(200)
        .json(new apiResponse(200, data, "Data Fetched Successfully"));
});

// Get all users under a company
const getCompanyUsers = asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(403, "Only companies can access this endpoint");
    }

    const users = await User.find({ companyId: req.user._id })
        .select("-password -refreshToken")
        .populate("companyId", "companyName companySpecialKey");

    res.status(200).json(
        new apiResponse(200, users, "Company users fetched successfully")
    );
});

// For The Testing Purpose To Get the User Data
const getUserProfile = asyncHandler(async (req, res) => {
    const token = req.cookies?.accessToken;
    const verify = jwt.verify(token, process.env.JWT_SECRET);
    const findUser = await User.findById(verify._id)
        .select("-password -refreshToken")
        .populate("currentPlan", "name price billingCycle features")
        .populate("currentSubscription", "status endDate trialEndDate")
        .populate("companyId", "companyName companySpecialKey isActive");

    if (!findUser) {
        throw new apiError(404, "User Not Found!");
    }

    // Check trial status for companies
    if (findUser.role === ROLES.COMPANY) {
        await findUser.checkTrialStatus();
    }

    res.status(200).json(
        new apiResponse(200, findUser, "User data fetched successfully!")
    );
});

// Promoting a User To QC-Admin
const promoteUser = asyncHandler(async (req, res) => {
    const { userId } = req.body;
    if (!userId) {
        throw new apiError(400, "User ID is required.");
    }

    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(
            403,
            "You don't have authority to perform this action"
        );
    }

    const userToPromote = await User.findById(userId);
    if (!userToPromote) {
        throw new apiError(404, "User not found.");
    }

    // Check if user belongs to the same company
    if (
        userToPromote.companyId &&
        !userToPromote.companyId.equals(req.user._id)
    ) {
        throw new apiError(
            403,
            "You can only promote users from your company."
        );
    }

    if (userToPromote.role === ROLES.QCADMIN) {
        return res
            .status(400)
            .json(new apiResponse(400, {}, "User is already a QcAdmin."));
    }

    userToPromote.role = ROLES.QCADMIN;
    await userToPromote.save();

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                { userId: userToPromote._id, role: userToPromote.role },
                "User promoted to QcAdmin successfully."
            )
        );
});

// Update Username email and Profile Picture
const updateUser = asyncHandler(async (req, res) => {
    const {
        name,
        email,
        description,
        slackId,
        upworkId,
        linkedinId,
        facebookId,
        gender,
        hourlyRate,
        companyName,
    } = req.body;
    const userId = req.user._id;

    let user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({ error: "User not found" });
    }

    const existingUser = await User.findOne({
        $or: [{ email }, { name }],
        _id: { $ne: userId },
    });

    if (existingUser) {
        return res.status(400).json({ error: "Email or Name already taken" });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (description) user.description = description;
    if (slackId) user.slackId = slackId;
    if (upworkId) user.upworkId = upworkId;
    if (linkedinId) user.linkedinId = linkedinId;
    if (facebookId) user.facebookId = facebookId;
    if (gender) user.gender = gender;
    if (hourlyRate) user.hourlyRate = hourlyRate;

    // Only allow company name update for company users
    if (companyName && user.role === ROLES.COMPANY) {
        user.companyName = companyName;
    }

    if (req.file) {
        const uploadResponse = await uploadOnCloudinary(req.file.path);
        if (!uploadResponse) {
            return res.status(500).json({ error: "Failed to upload image" });
        }
        user.avatar = uploadResponse.secure_url;
    }

    await user.save();
    const updatedUser = await User.findById(userId)
        .select("-password -refreshToken")
        .populate("companyId", "companyName companySpecialKey");

    return res.status(200).json({
        message: "User updated successfully",
        user: updatedUser,
    });
});

const getTeamUserProfile = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const findUser = await User.findById(id)
        .select("-password -refreshToken")
        .populate("companyId", "companyName companySpecialKey");

    if (!findUser) {
        throw new apiError(404, "User Not Found!");
    }

    // Check if the requesting user has permission to view this profile
    if (
        req.user.role === ROLES.USER &&
        !findUser.companyId?.equals(req.user.companyId)
    ) {
        throw new apiError(403, "You can only view users from your company.");
    }

    res.status(200).json(
        new apiResponse(200, findUser, "User data fetched successfully!")
    );
});

// Background job to check and block expired companies - WITH NOTIFICATIONS
const checkExpiredCompanies = asyncHandler(async (req, res) => {
    const expiredCompanies = await User.find({
        role: ROLES.COMPANY,
        planStatus: "trial",
        trialEndDate: { $lt: new Date() },
        isActive: true,
    });

    //   SEND EXPIRY NOTIFICATIONS TO EXPIRED COMPANIES
    for (const company of expiredCompanies) {
        try {
            await NotificationService.notifyTrialExpiring(company._id, 0); // 0 days = expired
        } catch (notificationError) {
            console.error(
                `Failed to send expiry notification to company ${company._id}:`,
                notificationError
            );
        }
    }

    await User.blockExpiredCompanies();
    res.status(200).json(
        new apiResponse(200, {}, "Expired companies checked and blocked")
    );
});

const updateCompanyLogo = asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(403, "Only company accounts can upload logos");
    }

    if (!req.file) {
        throw new apiError(400, "Logo file is required");
    }

    // Upload to Cloudinary
    const uploadResponse = await uploadOnCloudinary(req.file.path);
    if (!uploadResponse) {
        throw new apiError(500, "Failed to upload logo");
    }

    // Update company logo
    const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { companyLogo: uploadResponse.secure_url },
        { new: true }
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                updatedUser,
                "Company logo updated successfully"
            )
        );
});

const getCompanyLogo = asyncHandler(async (req, res) => {
    const { companyId } = req.params;

    const company = await User.findById(companyId).select(
        "companyLogo companyName"
    );

    if (!company) {
        throw new apiError(404, "Company not found");
    }

    // Check if requesting user is part of this company
    if (req.user.role === ROLES.USER && !req.user.companyId.equals(companyId)) {
        throw new apiError(403, "You can only view your company's logo");
    }

    return res.status(200).json(
        new apiResponse(
            200,
            {
                companyLogo: company.companyLogo,
                companyName: company.companyName,
            },
            "Company logo fetched successfully"
        )
    );
});

export {
    registerUser,
    loginUser,
    getAllData,
    logoutUser,
    refreshAccessToken,
    getUserData,
    getUserProfile,
    promoteUser,
    updateUser,
    getTeamUserProfile,
    getUserPlanDetails,
    getCompanyUsers,
    checkExpiredCompanies,
    updateCompanyLogo,
    getCompanyLogo,
    getCompanyUsersWithPlanStatus,
    checkFeatureAccess,
    getPlanUsageStats,
    requireActivePlan,
};
