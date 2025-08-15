import { Notification } from "../models/notificationModel.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ROLES } from "../config/roles.js";
import mongoose from "mongoose";

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

// Get user's notifications
const getUserNotifications = asyncHandler(async (req, res) => {
    const {
        page = 1,
        limit = 20,
        unreadOnly = false,
        type,
        sortBy = "createdAt",
        sortOrder = "desc",
    } = req.query;

    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    const skip = (page - 1) * limit;
    const sort = sortOrder === "asc" ? 1 : -1;
    // console.log("Query params:", {
    //     userId: req.user._id,
    //     companyId,
    //     unreadOnly,
    //     type
    // });
    // Putted this only for testing !!
    // const testNotif = await Notification.create({
    //     recipient: "68779058bf08da3cf1b5a0a4",
    //     companyId: "68779058bf08da3cf1b5a0a4",
    //     type: "WELCOME_MESSAGE",
    //     title: "Test Notification",
    //     message: "This is a test notification.",
    //     priority: "medium"
    // });
    // console.log("Test Notification Created:", testNotif);
    try {
        const notifications = await Notification.getNotificationsForUser(
            req.user._id,
            companyId,
            {
                limit: parseInt(limit),
                skip,
                unreadOnly: unreadOnly === "true",
                type,
                sortBy,
                sortOrder: sort,
            }
        );
        const total = await Notification.countDocuments({
            recipient: req.user._id,
            companyId,
            ...(unreadOnly === "true" && { isRead: false }),
            ...(type && { type }),
        });

        const unreadCount = await Notification.getUnreadCount(
            req.user._id,
            companyId
        );

        res.status(200).json(
            new apiResponse(
                200,
                {
                    notifications,
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(total / limit),
                        totalNotifications: total,
                        hasNextPage: page < Math.ceil(total / limit),
                        hasPrevPage: page > 1,
                    },
                    unreadCount,
                },
                "Notifications fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching notifications:", error);
        throw new apiError(500, "Failed to fetch notifications");
    }
});

// Get unread notifications count
const getUnreadCount = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    try {
        const unreadCount = await Notification.getUnreadCount(
            req.user._id,
            companyId
        );

        res.status(200).json(
            new apiResponse(
                200,
                { unreadCount },
                "Unread count fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching unread count:", error);
        throw new apiError(500, "Failed to fetch unread count");
    }
});

// Mark notifications as read
const markNotificationsAsRead = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;

    if (
        !notificationIds ||
        !Array.isArray(notificationIds) ||
        notificationIds.length === 0
    ) {
        throw new apiError(400, "Notification IDs array is required");
    }

    // Validate ObjectIds
    const validIds = notificationIds.filter((id) =>
        mongoose.isValidObjectId(id)
    );
    if (validIds.length === 0) {
        throw new apiError(400, "Valid notification IDs are required");
    }

    try {
        const result = await Notification.markAsRead(validIds, req.user._id);

        res.status(200).json(
            new apiResponse(
                200,
                {
                    updatedCount: result.modifiedCount,
                    totalRequested: validIds.length,
                },
                "Notifications marked as read"
            )
        );
    } catch (error) {
        console.error("Error marking notifications as read:", error);
        throw new apiError(500, "Failed to mark notifications as read");
    }
});

// Mark all notifications as read
const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    try {
        const result = await Notification.markAllAsRead(
            req.user._id,
            companyId
        );

        res.status(200).json(
            new apiResponse(
                200,
                {
                    updatedCount: result.modifiedCount,
                },
                "All notifications marked as read"
            )
        );
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        throw new apiError(500, "Failed to mark all notifications as read");
    }
});

// Get single notification details
const getNotificationById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!mongoose.isValidObjectId(id)) {
        throw new apiError(400, "Invalid notification ID");
    }

    try {
        const notification = await Notification.findOne({
            _id: id,
            recipient: req.user._id,
            companyId,
        })
            .populate("sender", "name avatar role")
            .populate("data.taskId", "title description dueDate projectTitle")
            .populate("data.recordingId", "title description createdAt");

        if (!notification) {
            throw new apiError(404, "Notification not found");
        }

        // Mark as read if not already read
        if (!notification.isRead) {
            await notification.markAsRead();
        }

        res.status(200).json(
            new apiResponse(
                200,
                notification,
                "Notification fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching notification:", error);
        if (error instanceof apiError) {
            throw error;
        }
        throw new apiError(500, "Failed to fetch notification");
    }
});

// Delete notification
const deleteNotification = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
        throw new apiError(400, "Invalid notification ID");
    }

    try {
        const notification = await Notification.findOneAndDelete({
            _id: id,
            recipient: req.user._id,
        });

        if (!notification) {
            throw new apiError(404, "Notification not found");
        }

        res.status(200).json(
            new apiResponse(
                200,
                { deletedId: id },
                "Notification deleted successfully"
            )
        );
    } catch (error) {
        console.error("Error deleting notification:", error);
        if (error instanceof apiError) {
            throw error;
        }
        throw new apiError(500, "Failed to delete notification");
    }
});

// Delete multiple notifications
const deleteNotifications = asyncHandler(async (req, res) => {
    const { notificationIds } = req.body;

    if (
        !notificationIds ||
        !Array.isArray(notificationIds) ||
        notificationIds.length === 0
    ) {
        throw new apiError(400, "Notification IDs array is required");
    }

    // Validate ObjectIds
    const validIds = notificationIds.filter((id) =>
        mongoose.isValidObjectId(id)
    );
    if (validIds.length === 0) {
        throw new apiError(400, "Valid notification IDs are required");
    }

    try {
        const result = await Notification.deleteMany({
            _id: { $in: validIds },
            recipient: req.user._id,
        });

        res.status(200).json(
            new apiResponse(
                200,
                {
                    deletedCount: result.deletedCount,
                    totalRequested: validIds.length,
                },
                "Notifications deleted successfully"
            )
        );
    } catch (error) {
        console.error("Error deleting notifications:", error);
        throw new apiError(500, "Failed to delete notifications");
    }
});

// Get notification statistics (Company owners only)
const getNotificationStats = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    // Only allow company owners to see stats
    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(
            403,
            "Access denied. Only company owners can view notification statistics"
        );
    }

    try {
        const [
            totalNotifications,
            unreadNotifications,
            notificationsByType,
            recentActivity,
        ] = await Promise.all([
            Notification.countDocuments({ companyId }),
            Notification.countDocuments({ companyId, isRead: false }),
            Notification.aggregate([
                {
                    $match: {
                        companyId: new mongoose.Types.ObjectId(companyId),
                    },
                },
                { $group: { _id: "$type", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),
            Notification.find({ companyId })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate("recipient", "name")
                .populate("sender", "name"),
        ]);

        const stats = {
            totalNotifications,
            unreadNotifications,
            readNotifications: totalNotifications - unreadNotifications,
            notificationsByType,
            recentActivity,
        };

        res.status(200).json(
            new apiResponse(
                200,
                { stats },
                "Notification statistics fetched successfully"
            )
        );
    } catch (error) {
        console.error("Error fetching notification stats:", error);
        throw new apiError(500, "Failed to fetch notification statistics");
    }
});

// Create manual notification (Company owners only)
const createManualNotification = asyncHandler(async (req, res) => {
    const {
        recipients,
        type = "SYSTEM_UPDATE",
        title,
        message,
        priority = "medium",
        channels = { inApp: true },
        actionButton,
    } = req.body;

    const companyId = getUserCompanyId(req.user);
    if (!companyId) {
        throw new apiError(400, "Company ID is required");
    }

    // Only allow company owners to create manual notifications
    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(
            403,
            "Access denied. Only company owners can create manual notifications"
        );
    }

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
        throw new apiError(400, "Recipients array is required");
    }

    if (!title || !message) {
        throw new apiError(400, "Title and message are required");
    }

    // Validate recipients are valid ObjectIds
    const validRecipients = recipients.filter((id) =>
        mongoose.isValidObjectId(id)
    );
    if (validRecipients.length === 0) {
        throw new apiError(400, "Valid recipient IDs are required");
    }

    try {
        const notifications = [];

        for (const recipientId of validRecipients) {
            const notification = new Notification({
                recipient: recipientId,
                sender: req.user._id,
                companyId,
                type,
                title,
                message,
                priority,
                channels,
                actionButton,
            });

            await notification.save();
            notifications.push(notification);
        }

        res.status(201).json(
            new apiResponse(
                201,
                {
                    createdCount: notifications.length,
                    notifications,
                },
                "Manual notifications created successfully"
            )
        );
    } catch (error) {
        console.error("Error creating manual notifications:", error);
        throw new apiError(500, "Failed to create manual notifications");
    }
});

// Cleanup old notifications (Company owners only)
const cleanupOldNotifications = asyncHandler(async (req, res) => {
    // Only allow company owners to cleanup notifications
    if (req.user.role !== ROLES.COMPANY) {
        throw new apiError(
            403,
            "Access denied. Only company owners can cleanup notifications"
        );
    }

    try {
        const result = await Notification.deleteOldNotifications();

        res.status(200).json(
            new apiResponse(
                200,
                {
                    deletedCount: result?.deletedCount || 0,
                },
                "Old notifications cleaned up successfully"
            )
        );
    } catch (error) {
        console.error("Error cleaning up notifications:", error);
        throw new apiError(500, "Failed to cleanup old notifications");
    }
});

// Helper function to create notification (to be used by other controllers)
const createNotification = async (notificationData) => {
    try {
        const notification = new Notification(notificationData);
        await notification.save();
        return notification;
    } catch (error) {
        console.error("Error creating notification:", error);
        throw error;
    }
};

// Helper function to create bulk notifications
const createBulkNotifications = async (recipients, notificationData) => {
    try {
        const notifications = recipients.map((recipientId) => ({
            ...notificationData,
            recipient: recipientId,
        }));

        const result = await Notification.insertMany(notifications);
        return result;
    } catch (error) {
        console.error("Error creating bulk notifications:", error);
        throw error;
    }
};

export {
    getUserNotifications,
    getUnreadCount,
    markNotificationsAsRead,
    markAllNotificationsAsRead,
    getNotificationById,
    deleteNotification,
    deleteNotifications,
    getNotificationStats,
    createManualNotification,
    cleanupOldNotifications,
    createNotification,
    createBulkNotifications,
};
