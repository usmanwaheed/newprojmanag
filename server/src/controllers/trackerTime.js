import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { userTracker } from "../models/TrackerTime.js";
import { adminTask } from "../models/adminTask.js";
import { ROLES } from "../config/roles.js";
import moment from "moment";
import mongoose from "mongoose";

// Cache for frequently accessed data
const projectCompanyCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get user's company ID
const getUserCompanyId = (user) => {
    if (user.role === ROLES.COMPANY) {
        return user._id;
    } else if (user.role === ROLES.USER && user.companyId) {
        return user.companyId;
    } else if (user.role === ROLES.QCADMIN && user.companyId) {
        return user.companyId;
    }
    return null;
};

// Optimized project validation with caching
const validateProjectCompany = async (projectId, companyId) => {
    const cacheKey = `${projectId}-${companyId}`;
    const cached = projectCompanyCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.project;
    }

    const project = await adminTask
        .findOne({ _id: projectId, companyId }, "projectTitle")
        .lean();
    if (!project) {
        throw new apiError(403, "Project not found or access denied");
    }

    // Cache the result
    projectCompanyCache.set(cacheKey, {
        project,
        timestamp: Date.now(),
    });

    return project;
};

// Clean cache periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of projectCompanyCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            projectCompanyCache.delete(key);
        }
    }
}, CACHE_TTL);

// Enhanced Check-In with better validation
const checkIn = asyncHandler(async (req, res) => {
    const { projectId, subTaskId } = req.body;
    const userId = req.user._id;
    const companyId = getUserCompanyId(req.user);
    const today = moment().format("YYYY-MM-DD");

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    if (!mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid Project ID");
    }

    // Validate project (with caching)
    await validateProjectCompany(projectId, companyId);

    // Use aggregation for better performance - check both conditions in one query
    const existingTimers = await userTracker.aggregate([
        {
            $match: {
                userId: new mongoose.Types.ObjectId(userId),
                companyId: new mongoose.Types.ObjectId(companyId),
                date: today,
                $or: [
                    {
                        projectId: new mongoose.Types.ObjectId(projectId),
                        isCheckedOut: false,
                    },
                    { isRunning: true, isCheckedOut: false },
                ],
            },
        },
        {
            $project: {
                projectId: 1,
                isRunning: 1,
                isCheckedOut: 1,
                isCurrentProject: {
                    $eq: ["$projectId", new mongoose.Types.ObjectId(projectId)],
                },
            },
        },
    ]);

    // Check for existing timer on same project
    const existingProjectTimer = existingTimers.find(
        (timer) => timer.isCurrentProject
    );
    if (existingProjectTimer) {
        throw new apiError(
            400,
            "You have already checked in for this project today."
        );
    }

    // Check for active timer on other projects
    const activeTimer = existingTimers.find((timer) => timer.isRunning);
    if (activeTimer) {
        throw new apiError(
            400,
            "You have an active timer running for another project. Please check out first."
        );
    }

    const timeEntry = new userTracker({
        userId,
        projectId,
        companyId,
        subTaskId: subTaskId || null,
        date: today,
        checkIn: new Date(),
        isRunning: true,
        effectiveElapsedTime: 0,
        pausedDuration: 0,
    });

    await timeEntry.save();

    // Populate only necessary fields
    const savedEntry = await userTracker
        .findById(timeEntry._id)
        .populate("userId", "name avatar")
        .populate("projectId", "projectTitle")
        .lean();

    res.status(200).json(
        new apiResponse(200, savedEntry, "Checked in successfully.")
    );
});

// Enhanced Get Elapsed Time with better calculation
const getElapsedTime = asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const userId = req.user._id;
    const companyId = getUserCompanyId(req.user);
    const today = moment().format("YYYY-MM-DD");

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    if (!mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid Project ID");
    }

    // Get timer with project info in one query
    const timer = await userTracker
        .findOne({
            userId,
            projectId,
            companyId,
            date: today,
            isCheckedOut: false,
        })
        .populate("projectId", "projectTitle")
        .lean();

    if (!timer) {
        return res.status(200).json(
            new apiResponse(
                200,
                {
                    isRunning: false,
                    elapsedTime: 0,
                    isCheckedOut: true,
                    projectTitle: "Unknown Project",
                },
                "No active timer found"
            )
        );
    }

    let elapsedTime = timer.effectiveElapsedTime || 0;

    if (timer.checkIn && timer.isRunning) {
        const currentTime = Date.now();
        const checkInTime = new Date(timer.checkIn).getTime();
        const rawElapsed = Math.floor((currentTime - checkInTime) / 1000);
        elapsedTime = Math.max(0, rawElapsed - (timer.pausedDuration || 0));
    }

    res.status(200).json(
        new apiResponse(
            200,
            {
                isRunning: timer.isRunning,
                isCheckedOut: timer.isCheckedOut,
                elapsedTime,
                maxTime: timer.maxTime,
                projectTitle:
                    timer.projectId?.projectTitle || "Unknown Project",
                pausedDuration: timer.pausedDuration || 0,
                checkInTime: timer.checkIn,
            },
            "Elapsed time fetched successfully."
        )
    );
});

// Enhanced Pause/Resume with atomic operations
const pauseOrResume = asyncHandler(async (req, res) => {
    const { projectId } = req.body;
    const userId = req.user._id;
    const companyId = getUserCompanyId(req.user);
    const today = moment().format("YYYY-MM-DD");

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    if (!mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid Project ID");
    }

    const currentTime = new Date();

    // Use findOneAndUpdate for atomic operation
    const timeEntry = await userTracker.findOne({
        userId,
        projectId,
        companyId,
        date: today,
        isCheckedOut: false,
    });

    if (!timeEntry) {
        throw new apiError(404, "No active session found to pause or resume.");
    }

    if (timeEntry.isCheckedOut) {
        throw new apiError(
            400,
            "You have already checked out for this project."
        );
    }

    let updateFields = {};

    if (timeEntry.isRunning) {
        // Pause the timer - calculate and save elapsed time
        const rawElapsed = Math.floor(
            (currentTime - new Date(timeEntry.checkIn)) / 1000
        );
        const effectiveElapsed = Math.max(
            0,
            rawElapsed - (timeEntry.pausedDuration || 0)
        );

        updateFields = {
            isRunning: false,
            lastPaused: currentTime,
            effectiveElapsedTime: effectiveElapsed,
        };
    } else {
        // Resume the timer - add paused time to pausedDuration
        if (!timeEntry.lastPaused) {
            throw new apiError(400, "Cannot resume without a paused state.");
        }

        const pausedTime = Math.floor(
            (currentTime - new Date(timeEntry.lastPaused)) / 1000
        );

        updateFields = {
            isRunning: true,
            lastPaused: null,
            pausedDuration: (timeEntry.pausedDuration || 0) + pausedTime,
        };
    }

    // Atomic update
    const updatedEntry = await userTracker.findByIdAndUpdate(
        timeEntry._id,
        updateFields,
        { new: true, lean: true }
    );

    // Calculate current elapsed time for response
    let elapsedTime = updatedEntry.effectiveElapsedTime || 0;
    if (updatedEntry.isRunning && updatedEntry.checkIn) {
        const rawElapsed = Math.floor(
            (Date.now() - new Date(updatedEntry.checkIn)) / 1000
        );
        elapsedTime = Math.max(
            0,
            rawElapsed - (updatedEntry.pausedDuration || 0)
        );
    }

    res.status(200).json(
        new apiResponse(
            200,
            {
                isRunning: updatedEntry.isRunning,
                elapsedTime,
                pausedDuration: updatedEntry.pausedDuration || 0,
            },
            updatedEntry.isRunning
                ? "Timer resumed successfully."
                : "Timer paused successfully."
        )
    );
});

// Enhanced Check-Out with better final calculation
const checkOut = asyncHandler(async (req, res) => {
    const { projectId } = req.body;
    const userId = req.user._id;
    const companyId = getUserCompanyId(req.user);
    const today = moment().format("YYYY-MM-DD");

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    if (!mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid Project ID");
    }

    const timeEntry = await userTracker.findOne({
        userId,
        projectId,
        companyId,
        date: today,
        isCheckedOut: false,
    });

    if (!timeEntry) {
        throw new apiError(404, "No active session found to check out.");
    }

    if (timeEntry.isCheckedOut) {
        throw new apiError(
            400,
            "You have already checked out for this project."
        );
    }

    // Don't allow checkout while paused
    if (!timeEntry.isRunning && timeEntry.lastPaused) {
        throw new apiError(
            400,
            "Cannot check out while paused. Resume the timer before checking out."
        );
    }

    const checkOutTime = new Date();
    let finalDuration = 0;

    if (timeEntry.checkIn) {
        const totalTime = Math.floor(
            (checkOutTime - new Date(timeEntry.checkIn)) / 1000
        );
        let totalPausedTime = timeEntry.pausedDuration || 0;

        // If currently paused, add current pause duration
        if (!timeEntry.isRunning && timeEntry.lastPaused) {
            totalPausedTime += Math.floor(
                (checkOutTime - new Date(timeEntry.lastPaused)) / 1000
            );
        }

        finalDuration = Math.max(0, totalTime - totalPausedTime);
    }

    // Update with final values
    const updatedEntry = await userTracker.findByIdAndUpdate(
        timeEntry._id,
        {
            checkOut: checkOutTime,
            totalDuration: finalDuration,
            effectiveElapsedTime: finalDuration,
            isCheckedOut: true,
            isRunning: false,
        },
        { new: true, lean: true }
    );

    res.status(200).json(
        new apiResponse(
            200,
            {
                totalDuration: finalDuration,
                formattedTime: formatTime(finalDuration),
                checkOutTime: checkOutTime,
            },
            "Checked out successfully."
        )
    );
});

// Enhanced Get User Time Project with better aggregation
const getUserTimeProject = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const companyId = getUserCompanyId(req.user);
    const { projectId, date } = req.query;

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Valid Project ID is required.");
    }

    const selectedDate = date || moment().format("YYYY-MM-DD");

    // Use lean() for better performance
    const timeEntries = await userTracker
        .find({
            userId,
            projectId,
            companyId,
            date: selectedDate,
        })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle")
        .sort({ checkIn: -1 })
        .lean();

    if (timeEntries.length === 0) {
        return res.status(200).json(
            new apiResponse(
                200,
                {
                    totalTime: 0,
                    entries: [],
                    projectId,
                    date: selectedDate,
                },
                `No time data found for project on ${selectedDate}.`
            )
        );
    }

    const totalTime = timeEntries.reduce((sum, entry) => {
        return sum + (entry.totalDuration || entry.effectiveElapsedTime || 0);
    }, 0);

    res.status(200).json(
        new apiResponse(
            200,
            {
                projectId,
                date: selectedDate,
                totalTime,
                formattedTotalTime: formatTime(totalTime),
                entries: timeEntries,
            },
            `User time for ${selectedDate} fetched successfully.`
        )
    );
});

// Rest of the functions remain the same...
const getUsersTimeProject = asyncHandler(async (req, res) => {
    const { projectId, startDate, endDate } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Valid Project ID is required.");
    }

    // Validate project belongs to company (with caching)
    await validateProjectCompany(projectId, companyId);

    const matchQuery = {
        projectId: new mongoose.Types.ObjectId(projectId),
        companyId: new mongoose.Types.ObjectId(companyId),
        isCheckedOut: true, // Only include completed sessions
    };

    if (startDate && endDate) {
        matchQuery.date = {
            $gte: startDate,
            $lte: endDate,
        };
    }

    const timeEntries = await userTracker.aggregate([
        { $match: matchQuery },
        {
            $group: {
                _id: "$userId",
                totalDuration: { $sum: "$totalDuration" },
                totalSessions: { $sum: 1 },
                avgSessionTime: { $avg: "$totalDuration" },
                lastActivity: { $max: "$checkOut" },
            },
        },
        {
            $lookup: {
                from: "userinfos",
                localField: "_id",
                foreignField: "_id",
                as: "user",
            },
        },
        { $unwind: "$user" },
        {
            $project: {
                userId: "$_id",
                name: "$user.name",
                avatar: "$user.avatar",
                role: "$user.role",
                totalDuration: 1,
                totalSessions: 1,
                avgSessionTime: { $round: "$avgSessionTime" },
                lastActivity: 1,
                formattedTotalTime: {
                    $concat: [
                        {
                            $toString: {
                                $floor: { $divide: ["$totalDuration", 3600] },
                            },
                        },
                        "h ",
                        {
                            $toString: {
                                $floor: {
                                    $divide: [
                                        { $mod: ["$totalDuration", 3600] },
                                        60,
                                    ],
                                },
                            },
                        },
                        "m",
                    ],
                },
            },
        },
        { $sort: { totalDuration: -1 } },
    ]);

    res.status(200).json(
        new apiResponse(
            200,
            timeEntries,
            timeEntries.length > 0
                ? "Project users' time fetched successfully."
                : "No users found for this project."
        )
    );
});

const getCompanyDashboard = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);
    const { startDate, endDate } = req.query;

    if (!companyId) {
        throw new apiError(400, "Company ID is required for time tracking.");
    }

    const today = moment().format("YYYY-MM-DD");
    const dateRange = {
        start: startDate || moment().subtract(7, "days").format("YYYY-MM-DD"),
        end: endDate || today,
    };

    // Get active timers (using lean for better performance)
    const activeTimers = await userTracker
        .find({
            companyId: new mongoose.Types.ObjectId(companyId),
            isRunning: true,
            isCheckedOut: false,
        })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle")
        .lean();

    // Get project statistics
    const projectStats = await userTracker.aggregate([
        {
            $match: {
                companyId: new mongoose.Types.ObjectId(companyId),
                date: {
                    $gte: dateRange.start,
                    $lte: dateRange.end,
                },
                isCheckedOut: true,
            },
        },
        {
            $group: {
                _id: "$projectId",
                totalTime: { $sum: "$totalDuration" },
                totalSessions: { $sum: 1 },
                uniqueUsers: { $addToSet: "$userId" },
                avgSessionTime: { $avg: "$totalDuration" },
            },
        },
        {
            $lookup: {
                from: "usertasks",
                localField: "_id",
                foreignField: "_id",
                as: "project",
            },
        },
        { $unwind: "$project" },
        {
            $project: {
                projectId: "$_id",
                projectTitle: "$project.projectTitle",
                totalTime: 1,
                totalSessions: 1,
                uniqueUsersCount: { $size: "$uniqueUsers" },
                avgSessionTime: { $round: "$avgSessionTime" },
            },
        },
        { $sort: { totalTime: -1 } },
    ]);

    // Get today's activity
    const todayActivity = await userTracker
        .find({
            companyId: new mongoose.Types.ObjectId(companyId),
            date: today,
        })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle")
        .lean();

    res.status(200).json(
        new apiResponse(
            200,
            {
                activeTimers: activeTimers.length,
                activeTimerDetails: activeTimers,
                projectStats,
                todayActivity,
                dateRange,
            },
            "Company dashboard data fetched successfully."
        )
    );
});

// Helper function to format time
const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return "0h 0m 0s";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    return `${hours}h ${minutes}m ${remainingSeconds}s`;
};

export {
    checkIn,
    pauseOrResume,
    checkOut,
    getElapsedTime,
    getUserTimeProject,
    getUsersTimeProject,
    getCompanyDashboard,
};
