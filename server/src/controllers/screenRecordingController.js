import { Recording } from "../models/recordingModel.js";
import { User } from "../models/userModel.js";
import { adminTask } from "../models/adminTask.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../utils/cloudinary.js";
import { ROLES } from "../config/roles.js";
import { NotificationService } from "../utils/notificationService.js";

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

// Helper function to check if user can approve recordings
const canApproveRecordings = (user) => {
    return user.role === ROLES.COMPANY || user.role === ROLES.QCADMIN;
};

// Start recording session (create initial recording record)
const startRecordingSession = asyncHandler(async (req, res) => {
    const {
        title,
        description,
        associatedTask,
        videoQuality = "medium",
    } = req.body;

    if (!title || !title.trim()) {
        throw new apiError(400, "Recording title is required");
    }
    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required to start recording");
    }

    // Validate associated task if provided
    if (associatedTask) {
        const task = await adminTask.findOne({
            _id: associatedTask,
            companyId: companyId,
        });
        if (!task) {
            throw new apiError(
                400,
                "Associated task not found or access denied"
            );
        }
    }

    // Generate unique session ID
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const recording = new Recording({
        title: title.trim(),
        description: description?.trim() || "",
        recordedBy: req.user._id,
        companyId: companyId,
        associatedTask: associatedTask || null,
        videoQuality,
        sessionId,
        recordingStatus: "recording",
        recordingStartTime: new Date(),
        uploadStatus: "pending",
        // Temporary values - will be updated when video is uploaded
        videoUrl: "temp",
        videoPublicId: "temp",
        videoSize: 0,
    });

    await recording.save();

    res.status(201).json(
        new apiResponse(
            201,
            {
                sessionId,
                recordingId: recording._id,
                status: "recording_started",
            },
            "Recording session started successfully"
        )
    );
});

// Upload recorded video
const uploadRecording = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const {
        videoDuration,
        screenResolution,
        tags,
        finalTitle,
        finalDescription,
    } = req.body;

    if (!req.file) {
        throw new apiError(400, "Video file is required");
    }

    const companyId = getUserCompanyId(req.user);
    const recording = await Recording.findOne({
        sessionId,
        recordedBy: req.user._id,
        companyId,
    });

    if (!recording) {
        throw new apiError(404, "Recording session not found");
    }

    // Update recording status to uploading
    recording.uploadStatus = "uploading";
    await recording.save();

    try {
        // Upload video to Cloudinary
        const uploadResult = await uploadOnCloudinary(req.file.path, {
            resource_type: "video",
            folder: `recordings/${companyId}`,
            public_id: `recording_${sessionId}`,
        });

        if (!uploadResult) {
            throw new apiError(500, "Failed to upload video");
        }

        // Update recording with video details
        recording.videoUrl = uploadResult.secure_url;
        recording.videoPublicId = uploadResult.public_id;
        recording.videoSize = req.file.size;
        recording.videoDuration = videoDuration || uploadResult.duration || 0;
        recording.videoFormat = uploadResult.format;
        recording.thumbnailUrl = uploadResult.secure_url.replace(
            /\.[^/.]+$/,
            ".jpg"
        );
        recording.screenResolution = screenResolution;
        recording.tags = tags ? tags.split(",").map((tag) => tag.trim()) : [];
        recording.uploadStatus = "uploaded";
        recording.recordingStatus = "completed";

        // Update title and description if provided
        if (finalTitle) recording.title = finalTitle.trim();
        if (finalDescription) recording.description = finalDescription.trim();

        // Auto-approve if uploaded by company owner
        if (req.user.role === ROLES.COMPANY) {
            recording.approvalStatus = "approved";
            recording.approvedBy = req.user._id;
            recording.approvedAt = new Date();
        }

        await recording.save();

        // 🔔 NOTIFICATION: Notify about recording upload
        try {
            await NotificationService.notifyRecordingUploaded(
                recording._id,
                req.user._id,
                companyId
            );
        } catch (notificationError) {
            console.error(
                "Failed to send recording upload notification:",
                notificationError
            );
            // Don't fail the main operation if notification fails
        }

        // Populate the recording for response
        const populatedRecording = await Recording.findById(recording._id)
            .populate("recordedBy", "name avatar role")
            .populate("associatedTask", "projectTitle description");

        console.log("Upload Success");
        res.status(200).json(
            new apiResponse(
                200,
                populatedRecording,
                "Recording uploaded successfully"
            )
        );
    } catch (error) {
        recording.uploadStatus = "failed";
        await recording.save();
        throw new apiError(500, "Failed to upload recording: " + error.message);
    }
});

// Update recording status (pause/resume/stop)
const updateRecordingStatus = asyncHandler(async (req, res) => {
    const { sessionId } = req.params;
    const { status } = req.body;

    const validStatuses = ["recording", "paused", "stopped", "completed"];
    if (!validStatuses.includes(status)) {
        throw new apiError(400, "Invalid recording status");
    }

    const companyId = getUserCompanyId(req.user);
    const recording = await Recording.findOne({
        sessionId,
        recordedBy: req.user._id,
        companyId,
    });

    if (!recording) {
        throw new apiError(404, "Recording session not found");
    }

    recording.recordingStatus = status;

    if (status === "stopped" || status === "completed") {
        recording.recordingEndTime = new Date();
    }

    await recording.save();

    res.status(200).json(
        new apiResponse(
            200,
            {
                sessionId,
                recordingId: recording._id,
                status: recording.recordingStatus,
                duration: recording.recordingEndTime
                    ? Math.floor(
                          (recording.recordingEndTime -
                              recording.recordingStartTime) /
                              1000
                      )
                    : null,
            },
            "Recording status updated successfully"
        )
    );
});

// Get user's recordings
const getUserRecordings = asyncHandler(async (req, res) => {
    const {
        approvalStatus,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = req.query;

    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    const skip = (page - 1) * limit;
    const sort = sortOrder === "asc" ? 1 : -1;

    const recordings = await Recording.getUserRecordings(
        req.user._id,
        companyId,
        {
            approvalStatus,
            limit: parseInt(limit),
            skip,
            sortBy,
            sortOrder: sort,
        }
    );

    const total = await Recording.countDocuments({
        recordedBy: req.user._id,
        companyId,
        isArchived: false,
        ...(approvalStatus && { approvalStatus }),
    });

    res.status(200).json(
        new apiResponse(
            200,
            {
                recordings,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecordings: total,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1,
                },
            },
            "User recordings fetched successfully"
        )
    );
});

// Get all company recordings (for company owners and QC admins)
const getCompanyRecordings = asyncHandler(async (req, res) => {
    const {
        approvalStatus,
        recordedBy,
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = req.query;

    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    const skip = (page - 1) * limit;
    const sort = sortOrder === "asc" ? 1 : -1;

    const recordings = await Recording.getRecordingsForCompany(companyId, {
        approvalStatus,
        recordedBy,
        limit: parseInt(limit),
        skip,
        sortBy,
        sortOrder: sort,
    });

    const total = await Recording.countDocuments({
        companyId,
        isArchived: false,
        ...(approvalStatus && { approvalStatus }),
        ...(recordedBy && { recordedBy }),
    });

    res.status(200).json(
        new apiResponse(
            200,
            {
                recordings,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalRecordings: total,
                    hasNextPage: page < Math.ceil(total / limit),
                    hasPrevPage: page > 1,
                },
            },
            "Company recordings fetched successfully"
        )
    );
});

// Get pending approvals
const getPendingApprovals = asyncHandler(async (req, res) => {
    if (!canApproveRecordings(req.user)) {
        throw new apiError(
            403,
            "You don't have permission to view pending approvals"
        );
    }

    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    const pendingRecordings = await Recording.getPendingApprovals(companyId);

    res.status(200).json(
        new apiResponse(
            200,
            pendingRecordings,
            "Pending approvals fetched successfully"
        )
    );
});

// Get single recording details
const getRecordingById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    const recording = await Recording.getRecordingByIdAndCompany(id, companyId);

    if (!recording) {
        throw new apiError(404, "Recording not found or access denied");
    }

    // Increment view count if not the owner
    if (recording.recordedBy._id.toString() !== req.user._id.toString()) {
        await recording.incrementViewCount(req.user._id);
    }

    res.status(200).json(
        new apiResponse(200, recording, "Recording fetched successfully")
    );
});

// Approve recording
const approveRecording = asyncHandler(async (req, res) => {
    if (!canApproveRecordings(req.user)) {
        throw new apiError(
            403,
            "You don't have permission to approve recordings"
        );
    }

    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    const recording = await Recording.findOne({
        _id: id,
        companyId,
        approvalStatus: "pending",
    });

    if (!recording) {
        throw new apiError(404, "Recording not found or already processed");
    }

    await recording.approve(req.user._id);

    // 🔔 NOTIFICATION: Notify about recording approval
    try {
        await NotificationService.notifyRecordingApprovalStatusChanged(
            recording._id,
            "approved",
            req.user._id,
            companyId
        );
    } catch (notificationError) {
        console.error(
            "Failed to send recording approval notification:",
            notificationError
        );
        // Don't fail the main operation if notification fails
    }

    const updatedRecording = await Recording.getRecordingByIdAndCompany(
        id,
        companyId
    );

    res.status(200).json(
        new apiResponse(
            200,
            updatedRecording,
            "Recording approved successfully"
        )
    );
});

// Reject recording
const rejectRecording = asyncHandler(async (req, res) => {
    if (!canApproveRecordings(req.user)) {
        throw new apiError(
            403,
            "You don't have permission to reject recordings"
        );
    }

    const { id } = req.params;
    const { reason } = req.body;
    const companyId = getUserCompanyId(req.user);

    const recording = await Recording.findOne({
        _id: id,
        companyId,
        approvalStatus: "pending",
    });

    if (!recording) {
        throw new apiError(404, "Recording not found or already processed");
    }

    await recording.reject(req.user._id, reason);

    // 🔔 NOTIFICATION: Notify about recording rejection
    try {
        await NotificationService.notifyRecordingApprovalStatusChanged(
            recording._id,
            "rejected",
            req.user._id,
            companyId
        );
    } catch (notificationError) {
        console.error(
            "Failed to send recording rejection notification:",
            notificationError
        );
        // Don't fail the main operation if notification fails
    }

    const updatedRecording = await Recording.getRecordingByIdAndCompany(
        id,
        companyId
    );

    res.status(200).json(
        new apiResponse(
            200,
            updatedRecording,
            "Recording rejected successfully"
        )
    );
});

// Update recording details (title, description, tags)
const updateRecording = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { title, description, tags } = req.body;
    const companyId = getUserCompanyId(req.user);

    const recording = await Recording.findOne({
        _id: id,
        recordedBy: req.user._id,
        companyId,
    });

    if (!recording) {
        throw new apiError(404, "Recording not found or access denied");
    }

    // Only allow editing if not yet approved or if user is company owner
    if (
        recording.approvalStatus === "approved" &&
        req.user.role !== ROLES.COMPANY
    ) {
        throw new apiError(403, "Cannot edit approved recordings");
    }

    if (title) recording.title = title.trim();
    if (description !== undefined) recording.description = description.trim();
    if (tags) recording.tags = tags.split(",").map((tag) => tag.trim());

    await recording.save();

    const updatedRecording = await Recording.getRecordingByIdAndCompany(
        id,
        companyId
    );

    res.status(200).json(
        new apiResponse(200, updatedRecording, "Recording updated successfully")
    );
});

// Delete recording
const deleteRecording = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    const recording = await Recording.findOne({
        _id: id,
        companyId,
    });

    if (!recording) {
        throw new apiError(404, "Recording not found");
    }

    // Check permissions
    const isOwner = recording.recordedBy.toString() === req.user._id.toString();
    const canDelete = isOwner || req.user.role === ROLES.COMPANY;

    if (!canDelete) {
        throw new apiError(
            403,
            "You don't have permission to delete this recording"
        );
    }

    try {
        // Delete video from Cloudinary
        if (recording.videoPublicId && recording.videoPublicId !== "temp") {
            await deleteFromCloudinary(recording.videoPublicId, "video");
        }

        // Delete recording from database
        await Recording.findByIdAndDelete(id);

        res.status(200).json(
            new apiResponse(
                200,
                { deletedId: id },
                "Recording deleted successfully"
            )
        );
    } catch (error) {
        throw new apiError(500, "Failed to delete recording: " + error.message);
    }
});

// Add comment to recording
const addComment = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    const companyId = getUserCompanyId(req.user);

    if (!comment || !comment.trim()) {
        throw new apiError(400, "Comment is required");
    }

    const recording = await Recording.findOne({
        _id: id,
        companyId,
    });

    if (!recording) {
        throw new apiError(404, "Recording not found or access denied");
    }

    await recording.addComment(req.user._id, comment.trim());

    // 🔔 NOTIFICATION: Notify about recording comment
    try {
        await NotificationService.notifyRecordingCommented(
            recording._id,
            req.user._id,
            companyId,
            comment.trim()
        );
    } catch (notificationError) {
        console.error(
            "Failed to send recording comment notification:",
            notificationError
        );
        // Don't fail the main operation if notification fails
    }

    const updatedRecording = await Recording.getRecordingByIdAndCompany(
        id,
        companyId
    );

    res.status(200).json(
        new apiResponse(200, updatedRecording, "Comment added successfully")
    );
});

// Get recording analytics (for company owners)
const getRecordingAnalytics = asyncHandler(async (req, res) => {
    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(403, "Only company owners can access analytics");
    }

    const companyId = getUserCompanyId(req.user);
    const { timeRange = "30" } = req.query; // days

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeRange));

    const analytics = await Recording.aggregate([
        {
            $match: {
                companyId: companyId,
                createdAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: null,
                totalRecordings: { $sum: 1 },
                approvedRecordings: {
                    $sum: {
                        $cond: [{ $eq: ["$approvalStatus", "approved"] }, 1, 0],
                    },
                },
                pendingRecordings: {
                    $sum: {
                        $cond: [{ $eq: ["$approvalStatus", "pending"] }, 1, 0],
                    },
                },
                rejectedRecordings: {
                    $sum: {
                        $cond: [{ $eq: ["$approvalStatus", "rejected"] }, 1, 0],
                    },
                },
                totalViews: { $sum: "$viewCount" },
                totalDuration: { $sum: "$videoDuration" },
                avgDuration: { $avg: "$videoDuration" },
            },
        },
    ]);

    const userStats = await Recording.aggregate([
        {
            $match: {
                companyId: companyId,
                createdAt: { $gte: startDate },
            },
        },
        {
            $group: {
                _id: "$recordedBy",
                recordingCount: { $sum: 1 },
                totalDuration: { $sum: "$videoDuration" },
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
        {
            $project: {
                user: { $arrayElemAt: ["$user", 0] },
                recordingCount: 1,
                totalDuration: 1,
            },
        },
        {
            $sort: { recordingCount: -1 },
        },
        {
            $limit: 10,
        },
    ]);

    res.status(200).json(
        new apiResponse(
            200,
            {
                overview: analytics[0] || {
                    totalRecordings: 0,
                    approvedRecordings: 0,
                    pendingRecordings: 0,
                    rejectedRecordings: 0,
                    totalViews: 0,
                    totalDuration: 0,
                    avgDuration: 0,
                },
                topUsers: userStats,
                timeRange: `${timeRange} days`,
            },
            "Recording analytics fetched successfully"
        )
    );
});

export {
    startRecordingSession,
    uploadRecording,
    updateRecordingStatus,
    getUserRecordings,
    getCompanyRecordings,
    getPendingApprovals,
    getRecordingById,
    approveRecording,
    rejectRecording,
    updateRecording,
    deleteRecording,
    addComment,
    getRecordingAnalytics,
};
