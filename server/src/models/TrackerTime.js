import mongoose, { Schema } from "mongoose";

const TimeTrackingSchema = new Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        projectId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userTask",
            required: true,
        },
        // NEW: Company reference for security - inherited from parent project
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        // Optional: SubTask reference for more granular tracking
        subTaskId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "subUserTask",
            default: null,
        },
        employee: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
        },
        date: {
            type: String,
            required: true,
        },
        checkIn: {
            type: Date,
            default: null,
        },
        isRunning: {
            type: Boolean,
            default: false,
        },
        checkOut: {
            type: Date,
        },
        isCheckedOut: {
            type: Boolean,
            default: false,
        },
        totalDuration: {
            type: Number,
            default: 0,
        },
        pausedDuration: {
            type: Number,
            default: 0,
        },
        isPaused: {
            type: Date,
            default: null,
        },
        lastPaused: {
            type: Date,
        },
        maxTime: {
            type: Number,
            default: 40,
        },
        weeklyTime: {
            type: Number,
            default: 0,
        },
        effectiveElapsedTime: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

// Add indexes for efficient querying
TimeTrackingSchema.index({ companyId: 1 });
TimeTrackingSchema.index({ userId: 1 });
TimeTrackingSchema.index({ projectId: 1 });
TimeTrackingSchema.index({ companyId: 1, userId: 1 });
TimeTrackingSchema.index({ companyId: 1, projectId: 1 });
TimeTrackingSchema.index({ companyId: 1, userId: 1, projectId: 1 });
TimeTrackingSchema.index({ companyId: 1, date: 1 });

// Static method to get time entries for a specific project and company
TimeTrackingSchema.statics.getTimeEntriesForProjectAndCompany = function (
    projectId,
    companyId
) {
    return this.find({ projectId, companyId })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle")
        .sort({ date: -1 });
};

// Static method to get time entry by ID and company (for security)
TimeTrackingSchema.statics.getTimeEntryByIdAndCompany = function (
    entryId,
    companyId
) {
    return this.findOne({ _id: entryId, companyId })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle");
};

// Static method to get user's time entries for a specific company
TimeTrackingSchema.statics.getUserTimeEntriesForCompany = function (
    userId,
    companyId,
    startDate,
    endDate
) {
    const query = { userId, companyId };

    if (startDate && endDate) {
        query.date = {
            $gte: startDate,
            $lte: endDate,
        };
    }

    return this.find(query)
        .populate("projectId", "projectTitle")
        .sort({ date: -1 });
};

// Static method to get company's daily time report
TimeTrackingSchema.statics.getCompanyDailyReport = function (companyId, date) {
    return this.find({ companyId, date })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle")
        .sort({ userId: 1 });
};

// Static method to get active timers for a company
TimeTrackingSchema.statics.getActiveTimersForCompany = function (companyId) {
    return this.find({
        companyId,
        isRunning: true,
        isCheckedOut: false,
    })
        .populate("userId", "name avatar role")
        .populate("projectId", "projectTitle");
};

// Static method to get user's active timer for a specific project and company
TimeTrackingSchema.statics.getUserActiveTimer = function (
    userId,
    projectId,
    companyId,
    date
) {
    return this.findOne({
        userId,
        projectId,
        companyId,
        date,
        isCheckedOut: false,
    });
};

// Static method to get company project statistics
TimeTrackingSchema.statics.getCompanyProjectStats = function (
    companyId,
    startDate,
    endDate
) {
    const matchStage = { companyId };

    if (startDate && endDate) {
        matchStage.date = {
            $gte: startDate,
            $lte: endDate,
        };
    }

    return this.aggregate([
        { $match: matchStage },
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
};

// Static method to validate project belongs to company
TimeTrackingSchema.statics.validateProjectCompany = async function (
    projectId,
    companyId
) {
    const { adminTask } = await import("./adminTask.js");
    const project = await adminTask.findOne({ _id: projectId, companyId });
    if (!project) {
        throw new Error("Project not found or access denied");
    }
    return project;
};

const userTracker = mongoose.model("TimeTracking", TimeTrackingSchema);

export { userTracker };
