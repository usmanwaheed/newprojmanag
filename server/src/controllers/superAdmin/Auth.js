// import { User } from "../../models/userModel.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { apiResponse } from "../../utils/apiResponse.js";
import { apiError } from "../../utils/apiError.js";
import Subscription from "../../models/SuperAdmin/Subscriptions.js";
import { SuperAdmin } from "../../adminPanel/model/superadminModel.js";
import jwt from "jsonwebtoken";

// Generate Access & Refresh Token of User
const generateAccessTokenAndRefreshToken = async (tokenId) => {
    const admin = await SuperAdmin.findById(tokenId);
    if (!admin) throw new apiError(404, "Admin not found");

    const accessAdminToken = admin.generateAccessAdminToken();
    const refreshAdminToken = admin.refreshAccessAdminToken();

    admin.refreshAdminToken = refreshAdminToken;
    await admin.save({ validateBeforeSave: false });
    return { accessAdminToken, refreshAdminToken };
};

// To Refresh user Login Access Token
export const refreshAccessAdminToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshAdminToken || req.body.refreshAdminToken;
    if (!incomingRefreshToken) {
        throw new apiError(401, "UnAuthorized Request");
    }
    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        );
        const admin = await SuperAdmin.findById(decodedToken._id).select(
            "-password"
        );
        if (!admin) {
            throw new apiError(401, "Invalid Refresh Token");
        }

        if (incomingRefreshToken !== admin?.refreshAdminToken) {
            throw new apiError(401, "Invalid or Expires Refresh Token");
        }

        const options = {
            httpOnly: true,
            secure: "true",
            sameSite: "None",
            maxAge: 12 * 24 * 60 * 60 * 1000,
        };
        const { accessAdminToken, refreshAdminToken } =
            await generateAccessTokenAndRefreshToken(admin?._id);
        console.log(accessAdminToken, refreshAdminToken);
        return res
            .status(200)
            .cookie("accessAdminToken", accessAdminToken, options)
            .cookie("refreshAdminToken", refreshAdminToken, options)
            .json(
                new apiResponse(
                    200,
                    { accessAdminToken, refreshAdminToken },
                    "Admin Access Token Refreshed Successfully"
                )
            );
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            // Clear refresh token from database and cookies
            const decodedToken = jwt.decode(incomingRefreshToken);
            if (decodedToken?._id) {
                const admin = await SuperAdmin.findById(decodedToken._id);
                if (admin) {
                    admin.refreshAdminToken = null;
                    await admin.save();
                }
            }
            res.clearCookie("accessAdminToken");
            res.clearCookie("refreshAdminToken");
        }
        return res.status(401).json({ message: "Admin Refresh Token Expired" });
    }
});
// @@@

export const loginSuperAdmin = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new apiError(400, "All fields are required");
    }

    const admin = await SuperAdmin.findOne({ email });

    if (!admin) {
        throw new apiError(404, "Admin not found");
    }
    if (!password) {
        throw new apiError(401, "Password is incorrect");
    }

    // Generate access and refresh tokens
    const { accessAdminToken, refreshAdminToken } =
        await generateAccessTokenAndRefreshToken(admin._id);
    // Get the user details without password and refreshToken
    const loggedInUser = await SuperAdmin.findById(admin._id).select(
        "-password -refreshAdminToken"
    );

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        maxAge: 12 * 24 * 60 * 60 * 1000,
    };

    // Send response with cookies
    return res
        .status(200)
        .cookie("accessAdminToken", accessAdminToken, options)
        .cookie("refreshAdminToken", refreshAdminToken, options)
        .json(
            new apiResponse(
                200,
                {
                    admin: loggedInUser,
                    accessAdminToken,
                    refreshAdminToken,
                },
                "Super Admin logged in successfully"
            )
        );
});

export const updateAdmin = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, isActive } = req.body;

    // Ensure at least one field is provided
    if (name === undefined && isActive === undefined && email === undefined) {
        throw new apiError(
            400,
            "At least one field (name, or isActive) is required for update"
        );
    }

    // Find the user by ID
    const admin = await SuperAdmin.findById(id);
    if (!admin) {
        throw new apiError(404, "Admin not found");
    }

    // if is active false then deactivate subscription
    // if (isActive === false && admin.isActive === true) {
    //     const subscription = await Subscription.findOne({ admin: id });
    //     if (subscription) {
    //         subscription.status = "cancelled";
    //         await subscription.save();
    //     }
    // }

    // if is active true then activate subscription
    // if (isActive === true && admin.isActive === false) {
    //     const subscription = await Subscription.findOne({ admin: id });
    //     if (subscription) {
    //         subscription.status = "active";
    //         await subscription.save();
    //     }
    // }

    // Update only provided fields (using PATCH semantics)
    if (name !== undefined) admin.name = name;
    // if (isActive !== undefined) admin.isActive = isActive;
    if (email !== undefined) admin.email = email;

    await admin.save();

    return res
        .status(200)
        .json(new apiResponse(200, admin, "Admin updated successfully!"));
});

// To get Logged In user Details
export const getAdminData = asyncHandler(async (req, res) => {
    const admin = await SuperAdmin.findById(req.user.id).select("-password");
    res.status(200).json(
        new apiResponse(200, admin, "Admin data fetched successfully")
    );
});

// To Logout a Person
export const logoutAdmin = asyncHandler(async (req, res) => {
    const options = {
        httpOnly: true,
        secure: true,
    };
    res.clearCookie("accessAdminToken", options);
    res.clearCookie("refreshAdminToken", options);
    return res
        .status(200)
        .json(new apiResponse(200, true, "SuperAdmin logged out successfully"));
});
