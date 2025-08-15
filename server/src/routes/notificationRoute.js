import { Router } from "express";
import {
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
} from "../controllers/notificationController.js";
import { verifyUser, verifyCompany } from "../middleware/authMiddleware.js";
import { ROLES } from "../config/roles.js";

const router = Router();

// Get user's notifications - All authenticated users can view their notifications
router
    .route("/")
    .get(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        getUserNotifications
    );

// Get unread notifications count - All authenticated users
router
    .route("/unread-count")
    .get(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        getUnreadCount
    );

// Mark specific notifications as read - All authenticated users
router
    .route("/mark-read")
    .put(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        markNotificationsAsRead
    );

// Mark all notifications as read - All authenticated users
router
    .route("/mark-all-read")
    .put(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        markAllNotificationsAsRead
    );

// Delete specific notifications - All authenticated users
router
    .route("/delete")
    .delete(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        deleteNotifications
    );

// Get notification statistics - Only company owners
router.route("/stats").get(verifyCompany(), getNotificationStats);

// Create manual notification - Only company owners
router.route("/create-manual").post(verifyCompany(), createManualNotification);

// Cleanup old notifications - Only company owners
router.route("/cleanup").delete(verifyCompany(), cleanupOldNotifications);

// Get single notification by ID - All authenticated users
router
    .route("/:id")
    .get(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        getNotificationById
    );

// Delete single notification - All authenticated users
router
    .route("/:id")
    .delete(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        deleteNotification
    );

export default router;
