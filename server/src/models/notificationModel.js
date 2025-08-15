import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
    {
        // Who should receive this notification
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },

        // Who triggered this notification (optional)
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            default: null,
        },

        // Company context (for multi-tenancy)
        companyId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "UserInfo",
            required: true,
        },

        // Notification type and content
        type: {
            type: String,
            required: true,
            enum: [
                // Task notifications
                "TASK_ASSIGNED",
                "TASK_UPDATED",
                "TASK_STATUS_CHANGED",
                "TASK_APPROVED",
                "TASK_REJECTED",
                "TASK_DUE_SOON",
                "TASK_OVERDUE",
                "TASK_COMPLETED",

                // Recording notifications
                "RECORDING_UPLOADED",
                "RECORDING_APPROVED",
                "RECORDING_REJECTED",
                "RECORDING_COMMENTED",
                "RECORDING_VIEWED",

                // Company/User notifications
                "USER_ADDED_TO_COMPANY",
                "USER_REMOVED_FROM_COMPANY",
                "COMPANY_PLAN_EXPIRING",
                "COMPANY_PLAN_EXPIRED",
                "TRIAL_EXPIRING",
                "SUBSCRIPTION_ACTIVATED",

                // System notifications
                "SYSTEM_MAINTENANCE",
                "SYSTEM_UPDATE",
                "WELCOME_MESSAGE",
            ],
        },

        title: {
            type: String,
            required: true,
            maxlength: [100, "Title should be no longer than 100 characters"],
        },

        message: {
            type: String,
            required: true,
            maxlength: [500, "Message should be no longer than 500 characters"],
        },

        // Additional data for the notification
        data: {
            taskId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "userTask",
                default: null,
            },
            recordingId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Recording",
                default: null,
            },
            userId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "UserInfo",
                default: null,
            },
            // Any additional custom data
            metadata: {
                type: mongoose.Schema.Types.Mixed,
                default: null,
            },
        },

        // Notification status
        isRead: {
            type: Boolean,
            default: false,
        },

        readAt: {
            type: Date,
            default: null,
        },

        // Priority level
        priority: {
            type: String,
            enum: ["low", "medium", "high", "urgent"],
            default: "medium",
        },

        // Delivery channels
        channels: {
            inApp: {
                type: Boolean,
                default: true,
            },
            email: {
                type: Boolean,
                default: false,
            },
            sms: {
                type: Boolean,
                default: false,
            },
            push: {
                type: Boolean,
                default: false,
            },
        },

        // Delivery status
        deliveryStatus: {
            inApp: {
                status: {
                    type: String,
                    enum: ["pending", "delivered", "failed"],
                    default: "pending",
                },
                deliveredAt: Date,
                error: String,
            },
            email: {
                status: {
                    type: String,
                    enum: ["pending", "delivered", "failed", "not_sent"],
                    default: "not_sent",
                },
                deliveredAt: Date,
                error: String,
            },
        },

        // Auto-delete after certain time (for cleanup)
        expiresAt: {
            type: Date,
            default: function () {
                // Auto-delete after 30 days
                return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            },
        },

        // Action button data (optional)
        actionButton: {
            text: String,
            url: String,
            action: String, // e.g., "APPROVE", "VIEW", "EDIT"
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// Indexes for efficient querying
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ companyId: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
notificationSchema.index({ "data.taskId": 1 });
notificationSchema.index({ "data.recordingId": 1 });

// Virtual for time ago
notificationSchema.virtual("timeAgo").get(function () {
    const now = new Date();
    const diff = now - this.createdAt;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return this.createdAt.toLocaleDateString();
});

// Static method to get notifications for user
notificationSchema.statics.getNotificationsForUser = function (
    userId,
    companyId,
    options = {}
) {
    const {
        limit = 20,
        skip = 0,
        unreadOnly = false,
        type = null,
        sortBy = "createdAt",
        sortOrder = -1,
    } = options;

    let query = { recipient: userId, companyId };

    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;

    return this.find(query)
        .populate("sender", "name avatar role")
        .populate("data.taskId", "projectTitle description")
        .populate("data.recordingId", "title description")
        .sort({ [sortBy]: sortOrder })
        .limit(limit)
        .skip(skip);
};

// Static method to get unread count
notificationSchema.statics.getUnreadCount = function (userId, companyId) {
    return this.countDocuments({
        recipient: userId,
        companyId,
        isRead: false,
    });
};

// Static method to mark notifications as read
notificationSchema.statics.markAsRead = function (notificationIds, userId) {
    return this.updateMany(
        {
            _id: { $in: notificationIds },
            recipient: userId,
        },
        {
            isRead: true,
            readAt: new Date(),
        }
    );
};

// Static method to mark all as read for user
notificationSchema.statics.markAllAsRead = function (userId, companyId) {
    return this.updateMany(
        {
            recipient: userId,
            companyId,
            isRead: false,
        },
        {
            isRead: true,
            readAt: new Date(),
        }
    );
};

// Static method to delete old notifications
notificationSchema.statics.deleteOldNotifications = function (days = 30) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true,
    });
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function () {
    this.isRead = true;
    this.readAt = new Date();
    return this.save();
};

// Pre-save middleware to set delivery status
notificationSchema.pre("save", function (next) {
    if (this.isNew) {
        // Set in-app delivery as delivered by default
        this.deliveryStatus.inApp.status = "delivered";
        this.deliveryStatus.inApp.deliveredAt = new Date();
    }
    next();
});

const Notification = mongoose.model("Notification", notificationSchema);
export { Notification };
