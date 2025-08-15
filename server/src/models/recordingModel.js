import mongoose from "mongoose";

const recordingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Recording title is required"],
            maxlength: [100, "Title should be no longer than 100 characters"],
            trim: true,
        },
        description: {
            type: String,
            maxlength: [
                500,
                "Description should be no longer than 500 characters",
            ],
            trim: true,
            default: "",
        },
        // File information
        videoUrl: {
            type: String,
            required: [true, "Video URL is required"],
        },
        videoPublicId: {
            type: String, // For Cloudinary public ID (for deletion)
            required: [true, "Video public ID is required"],
        },
        videoSize: {
            type: Number, // File size in bytes
            required: true,
        },
        videoDuration: {
            type: Number, // Duration in seconds
            default: 0,
        },
        videoFormat: {
            type: String,
            default: "webm",
        },
        thumbnailUrl: {
            type: String, // Auto-generated thumbnail
            default: null,
        },

        // Recording metadata
        recordingStatus: {
            type: String,
            enum: ["recording", "paused", "stopped", "completed"],
            default: "completed",
        },
        approvalStatus: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        uploadStatus: {
            type: String,
            enum: ["pending", "uploading", "uploaded", "failed"],
            default: "pending",
        },

        // User and company references
        recordedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },

        // Approval workflow
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            default: null,
        },
        approvedAt: {
            type: Date,
            default: null,
        },
        rejectionReason: {
            type: String,
            maxlength: [
                300,
                "Rejection reason should be no longer than 300 characters",
            ],
            default: null,
        },

        // Task association (optional)
        associatedTask: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "userTask",
            default: null,
        },

        // Visibility settings
        isPublic: {
            type: Boolean,
            default: false, // Only visible to company members by default
        },
        isArchived: {
            type: Boolean,
            default: false,
        },

        // View tracking
        viewCount: {
            type: Number,
            default: 0,
        },
        viewedBy: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "UserInfo",
                },
                viewedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],

        // Recording session info
        sessionId: {
            type: String, // For tracking recording sessions
            default: null,
        },
        recordingStartTime: {
            type: Date,
            default: null,
        },
        recordingEndTime: {
            type: Date,
            default: null,
        },

        // Quality settings
        videoQuality: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
        screenResolution: {
            type: String,
            default: null,
        },

        // Tags for organization
        tags: [
            {
                type: String,
                trim: true,
            },
        ],

        // Comments/feedback
        comments: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "UserInfo",
                },
                comment: {
                    type: String,
                    maxlength: [
                        500,
                        "Comment should be no longer than 500 characters",
                    ],
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for efficient querying
recordingSchema.index({ companyId: 1 });
recordingSchema.index({ recordedBy: 1 });
recordingSchema.index({ companyId: 1, recordedBy: 1 });
recordingSchema.index({ approvalStatus: 1 });
recordingSchema.index({ uploadStatus: 1 });
recordingSchema.index({ associatedTask: 1 });
recordingSchema.index({ createdAt: -1 });
recordingSchema.index({ approvedAt: -1 });

// Virtual for recording duration in readable format
recordingSchema.virtual("durationFormatted").get(function () {
    if (!this.videoDuration) return "Unknown";
    const minutes = Math.floor(this.videoDuration / 60);
    const seconds = Math.floor(this.videoDuration % 60);
    return `${minutes}m ${seconds}s`;
});

// Virtual for file size in readable format
recordingSchema.virtual("fileSizeFormatted").get(function () {
    if (!this.videoSize) return "Unknown";
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(this.videoSize) / Math.log(1024));
    return (
        Math.round((this.videoSize / Math.pow(1024, i)) * 100) / 100 +
        " " +
        sizes[i]
    );
});

// Virtual to check if recording is approved
recordingSchema.virtual("isApproved").get(function () {
    return this.approvalStatus === "approved";
});

// Virtual to check if recording is pending approval
recordingSchema.virtual("isPendingApproval").get(function () {
    return this.approvalStatus === "pending";
});

// Static method to get recordings for a specific company
recordingSchema.statics.getRecordingsForCompany = function (
    companyId,
    options = {}
) {
    const {
        status = null,
        approvalStatus = null,
        recordedBy = null,
        limit = 20,
        skip = 0,
        sortBy = "createdAt",
        sortOrder = -1,
    } = options;

    let query = { companyId, isArchived: false };

    if (status) query.recordingStatus = status;
    if (approvalStatus) query.approvalStatus = approvalStatus;
    if (recordedBy) query.recordedBy = recordedBy;

    return this.find(query)
        .populate("recordedBy", "name avatar role")
        .populate("approvedBy", "name avatar role")
        .populate("associatedTask", "projectTitle")
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);
};

// Static method to get recording by ID and company (for security)
recordingSchema.statics.getRecordingByIdAndCompany = function (
    recordingId,
    companyId
) {
    return this.findOne({ _id: recordingId, companyId })
        .populate("recordedBy", "name avatar role email")
        .populate("approvedBy", "name avatar role email")
        .populate("associatedTask", "projectTitle description dueDate")
        .populate("comments.user", "name avatar role");
};

// Static method to get user's recordings
recordingSchema.statics.getUserRecordings = function (
    userId,
    companyId,
    options = {}
) {
    const {
        approvalStatus = null,
        limit = 20,
        skip = 0,
        sortBy = "createdAt",
        sortOrder = -1,
    } = options;

    let query = { recordedBy: userId, companyId, isArchived: false };

    if (approvalStatus) query.approvalStatus = approvalStatus;

    return this.find(query)
        .populate("approvedBy", "name avatar role")
        .populate("associatedTask", "projectTitle")
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);
};

// Static method to get pending approvals for company/QcAdmin
recordingSchema.statics.getPendingApprovals = function (companyId) {
    return this.find({
        companyId,
        approvalStatus: "pending",
        uploadStatus: "uploaded",
        isArchived: false,
    })
        .populate("recordedBy", "name avatar role email")
        .populate("associatedTask", "projectTitle description")
        .sort({ createdAt: -1 });
};

// Instance method to approve recording
recordingSchema.methods.approve = function (approvedBy) {
    this.approvalStatus = "approved";
    this.approvedBy = approvedBy;
    this.approvedAt = new Date();
    return this.save();
};

// Instance method to reject recording
recordingSchema.methods.reject = function (rejectedBy, reason = null) {
    this.approvalStatus = "rejected";
    this.approvedBy = rejectedBy;
    this.approvedAt = new Date();
    if (reason) this.rejectionReason = reason;
    return this.save();
};

// Instance method to add comment
recordingSchema.methods.addComment = function (userId, comment) {
    this.comments.push({
        user: userId,
        comment: comment,
        createdAt: new Date(),
    });
    return this.save();
};

// Instance method to increment view count
recordingSchema.methods.incrementViewCount = function (userId) {
    // Check if user has already viewed this recording
    const hasViewed = this.viewedBy.some(
        (view) => view.user.toString() === userId.toString()
    );

    if (!hasViewed) {
        this.viewCount += 1;
        this.viewedBy.push({
            user: userId,
            viewedAt: new Date(),
        });
    }

    return this.save();
};

// Pre-save middleware to set company ID if not provided
recordingSchema.pre("save", async function (next) {
    if (!this.companyId && this.recordedBy) {
        const User = mongoose.model("UserInfo");
        const user = await User.findById(this.recordedBy);

        if (user) {
            if (user.role === "company") {
                this.companyId = user._id;
            } else if (user.companyId) {
                this.companyId = user.companyId;
            }
        }
    }
    next();
});

const Recording = mongoose.model("Recording", recordingSchema);
export { Recording };
