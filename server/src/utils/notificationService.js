import { ROLES } from "../config/roles.js";
import { Notification } from "../models/notificationModel.js";
import { User } from "../models/userModel.js";

class NotificationService {
    // Create a notification
    static async createNotification({
        recipient,
        sender = null,
        companyId,
        type,
        title,
        message,
        data = {},
        priority = "medium",
        channels = { inApp: true },
        actionButton = null,
    }) {
        try {
            const notification = new Notification({
                recipient,
                sender,
                companyId,
                type,
                title,
                message,
                data,
                priority,
                channels,
                actionButton,
            });

            await notification.save();

            // Populate for immediate use
            await notification.populate("sender", "name avatar role");

            console.log(
                `  Notification created: ${type} for user ${recipient}`
            );
            return notification;
        } catch (error) {
            console.error("  Error creating notification:", error);
            throw error;
        }
    }

    // Send notification to multiple recipients
    static async createBulkNotifications({
        recipients,
        sender = null,
        companyId,
        type,
        title,
        message,
        data = {},
        priority = "medium",
        channels = { inApp: true },
    }) {
        try {
            const notifications = recipients.map((recipient) => ({
                recipient,
                sender,
                companyId,
                type,
                title,
                message,
                data,
                priority,
                channels,
            }));

            const createdNotifications =
                await Notification.insertMany(notifications);
            console.log(
                `  ${createdNotifications.length} bulk notifications created`
            );
            return createdNotifications;
        } catch (error) {
            console.error("  Error creating bulk notifications:", error);
            throw error;
        }
    }

    // TASK-RELATED NOTIFICATIONS
    static async notifyTaskAssigned(
        taskId,
        assignedUsers,
        assignedBy,
        companyId
    ) {
        try {
            // Get user IDs for assigned users
            const users = await User.find({
                name: { $in: assignedUsers },
                companyId: companyId,
            }).select("_id name");

            if (users.length === 0) return;

            const recipients = users.map((user) => user._id);
            const userNames = users.map((user) => user.name).join(", ");

            await this.createBulkNotifications({
                recipients,
                sender: assignedBy,
                companyId,
                type: "TASK_ASSIGNED",
                title: "New Task Assigned",
                message: `You have been assigned to a new task. Check your dashboard for details.`,
                data: { taskId },
                priority: "high",
                actionButton: {
                    text: "View Task",
                    action: "VIEW_TASK",
                },
            });

            console.log(
                `📋 Task assignment notifications sent to: ${userNames}`
            );
        } catch (error) {
            console.error(
                "  Error sending task assignment notifications:",
                error
            );
        }
    }

    static async notifyTaskStatusChanged(taskId, status, changedBy, companyId) {
        try {
            // Get task details and notify the assigner
            const task = await mongoose
                .model("userTask")
                .findById(taskId)
                .populate("assignedBy", "_id name");

            if (!task || !task.assignedBy) return;

            // Don't notify if the person who changed it is the same as assigned by
            if (task.assignedBy._id.toString() === changedBy.toString()) return;

            await this.createNotification({
                recipient: task.assignedBy._id,
                sender: changedBy,
                companyId,
                type: "TASK_STATUS_CHANGED",
                title: "Task Status Updated",
                message: `Task "${task.projectTitle}" status changed to: ${status}`,
                data: { taskId },
                priority: "medium",
                actionButton: {
                    text: "View Task",
                    action: "VIEW_TASK",
                },
            });

            console.log(
                `📋 Task status change notification sent for task: ${task.projectTitle}`
            );
        } catch (error) {
            console.error(
                "  Error sending task status change notification:",
                error
            );
        }
    }

    static async notifyTaskApprovalStatusChanged(
        taskId,
        projectStatus,
        approvedBy,
        companyId
    ) {
        try {
            // Get task details and notify assigned users
            const task = await mongoose.model("userTask").findById(taskId);
            if (!task) return;

            // Get assigned user IDs
            const users = await User.find({
                name: { $in: task.teamLeadName },
                companyId: companyId,
            }).select("_id");

            const recipients = users.map((user) => user._id);

            const isApproved = projectStatus === "approved";
            const title = isApproved
                ? "Task Approved  "
                : "Task Not Approved  ";
            const message = isApproved
                ? `Great news! Your task "${task.projectTitle}" has been approved.`
                : `Your task "${task.projectTitle}" was not approved. Please check for feedback.`;

            await this.createBulkNotifications({
                recipients,
                sender: approvedBy,
                companyId,
                type: isApproved ? "TASK_APPROVED" : "TASK_REJECTED",
                title,
                message,
                data: { taskId },
                priority: isApproved ? "medium" : "high",
                actionButton: {
                    text: "View Task",
                    action: "VIEW_TASK",
                },
            });

            console.log(
                `📋 Task approval notification sent for: ${task.projectTitle}`
            );
        } catch (error) {
            console.error("  Error sending task approval notification:", error);
        }
    }

    static async notifyTaskDueSoon(taskId, companyId) {
        try {
            const task = await mongoose.model("userTask").findById(taskId);
            if (!task) return;

            // Get assigned user IDs
            const users = await User.find({
                name: { $in: task.teamLeadName },
                companyId: companyId,
            }).select("_id");

            const recipients = users.map((user) => user._id);

            await this.createBulkNotifications({
                recipients,
                companyId,
                type: "TASK_DUE_SOON",
                title: "Task Due Soon ⏰",
                message: `Reminder: Task "${task.projectTitle}" is due in 24 hours.`,
                data: { taskId },
                priority: "high",
                actionButton: {
                    text: "View Task",
                    action: "VIEW_TASK",
                },
            });

            console.log(
                `📋 Due soon notification sent for: ${task.projectTitle}`
            );
        } catch (error) {
            console.error("  Error sending task due soon notification:", error);
        }
    }

    // RECORDING-RELATED NOTIFICATIONS
    static async notifyRecordingUploaded(recordingId, uploadedBy, companyId) {
        try {
            const recording = await mongoose
                .model("Recording")
                .findById(recordingId);
            if (!recording) return;

            // Notify company owner and QC admins
            const admins = await User.find({
                companyId,
                role: { $in: [ROLES.COMPANY, ROLES.QCADMIN] },
                _id: { $ne: uploadedBy }, // Don't notify the uploader
            }).select("_id");

            const recipients = admins.map((admin) => admin._id);

            await this.createBulkNotifications({
                recipients,
                sender: uploadedBy,
                companyId,
                type: "RECORDING_UPLOADED",
                title: "New Recording Uploaded",
                message: `A new recording "${recording.title}" has been uploaded and is pending approval.`,
                data: { recordingId },
                priority: "medium",
                actionButton: {
                    text: "Review Recording",
                    action: "VIEW_RECORDING",
                },
            });

            console.log(
                `🎥 Recording upload notification sent for: ${recording.title}`
            );
        } catch (error) {
            console.error(
                "  Error sending recording upload notification:",
                error
            );
        }
    }

    static async notifyRecordingApprovalStatusChanged(
        recordingId,
        approvalStatus,
        approvedBy,
        companyId
    ) {
        try {
            const recording = await mongoose
                .model("Recording")
                .findById(recordingId)
                .populate("recordedBy", "_id name");

            if (!recording || !recording.recordedBy) return;

            // Don't notify if the person who approved it is the same as recorded by
            if (recording.recordedBy._id.toString() === approvedBy.toString())
                return;

            const isApproved = approvalStatus === "approved";
            const title = isApproved
                ? "Recording Approved  "
                : "Recording Rejected  ";
            const message = isApproved
                ? `Your recording "${recording.title}" has been approved.`
                : `Your recording "${recording.title}" was rejected. ${recording.rejectionReason || "Please check for feedback."}`;

            await this.createNotification({
                recipient: recording.recordedBy._id,
                sender: approvedBy,
                companyId,
                type: isApproved ? "RECORDING_APPROVED" : "RECORDING_REJECTED",
                title,
                message,
                data: { recordingId },
                priority: isApproved ? "medium" : "high",
                actionButton: {
                    text: "View Recording",
                    action: "VIEW_RECORDING",
                },
            });

            console.log(
                `🎥 Recording approval notification sent for: ${recording.title}`
            );
        } catch (error) {
            console.error(
                "  Error sending recording approval notification:",
                error
            );
        }
    }

    static async notifyRecordingCommented(
        recordingId,
        commentedBy,
        companyId,
        comment
    ) {
        try {
            const recording = await mongoose
                .model("Recording")
                .findById(recordingId)
                .populate("recordedBy", "_id name");

            if (!recording || !recording.recordedBy) return;

            // Don't notify if the person who commented is the same as recorded by
            if (recording.recordedBy._id.toString() === commentedBy.toString())
                return;

            await this.createNotification({
                recipient: recording.recordedBy._id,
                sender: commentedBy,
                companyId,
                type: "RECORDING_COMMENTED",
                title: "New Comment on Recording",
                message: `Someone commented on your recording "${recording.title}": "${comment.substring(0, 100)}${comment.length > 100 ? "..." : ""}"`,
                data: { recordingId },
                priority: "low",
                actionButton: {
                    text: "View Recording",
                    action: "VIEW_RECORDING",
                },
            });

            console.log(
                `🎥 Recording comment notification sent for: ${recording.title}`
            );
        } catch (error) {
            console.error(
                "  Error sending recording comment notification:",
                error
            );
        }
    }

    // ALL FOR THE SUBSCRIPTION  ------- NEW ---------
    static async notifySubscriptionCreated(
        userId,
        companyId,
        planName,
        isTrialPlan = false
    ) {
        try {
            const title = isTrialPlan
                ? "Trial Started! 🎉"
                : "Subscription Activated! 🚀";
            const message = isTrialPlan
                ? `Your ${planName} trial has started. Explore all features during your trial period.`
                : `Your ${planName} subscription has been activated. Enjoy all the premium features!`;

            await this.createNotification({
                recipient: userId,
                companyId,
                type: isTrialPlan ? "TRIAL_EXPIRING" : "SUBSCRIPTION_ACTIVATED",
                title,
                message,
                priority: "medium",
                actionButton: {
                    text: "View Dashboard",
                    action: "VIEW_DASHBOARD",
                },
            });

            console.log(
                `  Subscription created notification sent to user ${userId}`
            );
        } catch (error) {
            console.error(
                "  Error sending subscription created notification:",
                error
            );
        }
    }

    static async notifySubscriptionCancelled(
        userId,
        companyId,
        planName,
        reason = ""
    ) {
        try {
            await this.createNotification({
                recipient: userId,
                companyId,
                type: "SUBSCRIPTION_ACTIVATED", // Using existing enum
                title: "Subscription Cancelled 😔",
                message: `Your ${planName} subscription has been cancelled. ${reason ? `Reason: ${reason}` : ""} You can reactivate anytime.`,
                priority: "medium",
                actionButton: {
                    text: "Browse Plans",
                    action: "VIEW_PLANS",
                },
            });

            console.log(
                `  Subscription cancelled notification sent to user ${userId}`
            );
        } catch (error) {
            console.error(
                "  Error sending subscription cancelled notification:",
                error
            );
        }
    }

    static async notifyPlanChanged(
        userId,
        companyId,
        oldPlanName,
        newPlanName
    ) {
        try {
            await this.createNotification({
                recipient: userId,
                companyId,
                type: "SUBSCRIPTION_ACTIVATED",
                title: "Plan Updated Successfully! 🔄",
                message: `Your plan has been changed from ${oldPlanName} to ${newPlanName}. New features are now available!`,
                priority: "medium",
                actionButton: {
                    text: "Explore Features",
                    action: "VIEW_DASHBOARD",
                },
            });

            console.log(`  Plan changed notification sent to user ${userId}`);
        } catch (error) {
            console.error("  Error sending plan changed notification:", error);
        }
    }

    static async notifyTrialExpiring(userId, companyId, daysLeft, planName) {
        try {
            await this.createNotification({
                recipient: userId,
                companyId,
                type: "TRIAL_EXPIRING",
                title: `Trial Expires in ${daysLeft} Days ⏰`,
                message: `Your ${planName} trial will expire in ${daysLeft} days. Upgrade now to continue using all features.`,
                priority: daysLeft <= 3 ? "high" : "medium",
                actionButton: {
                    text: "Upgrade Now",
                    action: "UPGRADE_PLAN",
                },
            });

            console.log(`  Trial expiring notification sent to user ${userId}`);
        } catch (error) {
            console.error(
                "  Error sending trial expiring notification:",
                error
            );
        }
    }

    // PLAN NOTIFICATIONS
    static async notifyPlanStatusChanged(adminId = null, planName, isActive) {
        try {
            // Notify all super admins about plan status changes
            const admins = await User.find({ role: ROLES.SUPER_ADMIN });

            const notifications = admins.map((admin) =>
                this.createNotification({
                    recipient: admin._id,
                    sender: adminId,
                    companyId: admin._id, // For super admin, company is self
                    type: "SYSTEM_UPDATE",
                    title: `Plan ${isActive ? "Activated" : "Deactivated"} 📋`,
                    message: `The ${planName} plan has been ${isActive ? "activated" : "deactivated"}.`,
                    priority: "low",
                    actionButton: {
                        text: "View Plans",
                        action: "VIEW_PLANS",
                    },
                })
            );

            await Promise.all(notifications);
            console.log(
                `  Plan status change notifications sent for ${planName}`
            );
        } catch (error) {
            console.error("  Error sending plan status notifications:", error);
        }
    }

    static async notifyNewPlanCreated(adminId, planName, price, billingCycle) {
        try {
            // Notify all super admins about new plan
            const admins = await User.find({
                role: ROLES.SUPER_ADMIN,
                _id: { $ne: adminId },
            });

            const notifications = admins.map((admin) =>
                this.createNotification({
                    recipient: admin._id,
                    sender: adminId,
                    companyId: admin._id,
                    type: "SYSTEM_UPDATE",
                    title: "New Plan Created! 🆕",
                    message: `A new plan "${planName}" has been created at $${price}/${billingCycle}.`,
                    priority: "low",
                    actionButton: {
                        text: "View Plan",
                        action: "VIEW_PLANS",
                    },
                })
            );

            await Promise.all(notifications);
            console.log(
                `  New plan creation notifications sent for ${planName}`
            );
        } catch (error) {
            console.error("  Error sending new plan notifications:", error);
        }
    }

    // ADMIN NOTIFICATIONS
    static async notifyAdminOfSubscriptionActivity(
        adminId,
        action,
        userName,
        planName
    ) {
        try {
            const actions = {
                created: "subscribed to",
                cancelled: "cancelled",
                changed: "changed plan to",
            };

            await this.createNotification({
                recipient: adminId,
                companyId: adminId,
                type: "SYSTEM_UPDATE",
                title: `Subscription ${action.charAt(0).toUpperCase() + action.slice(1)} 📊`,
                message: `${userName} has ${actions[action]} ${planName}.`,
                priority: "low",
                actionButton: {
                    text: "View Analytics",
                    action: "VIEW_ANALYTICS",
                },
            });

            console.log(`  Admin notification sent for subscription ${action}`);
        } catch (error) {
            console.error("  Error sending admin notification:", error);
        }
    }
    // ALL FOR THE SUBSCRIPTION  ------- NEW ---------

    // COMPANY/USER NOTIFICATIONS
    static async notifyUserAddedToCompany(userId, companyId, addedBy) {
        try {
            await this.createNotification({
                recipient: userId,
                sender: addedBy,
                companyId,
                type: "USER_ADDED_TO_COMPANY",
                title: "Welcome to the Team! 🎉",
                message:
                    "You have been added to the company. Explore your dashboard to get started.",
                data: { userId },
                priority: "medium",
                actionButton: {
                    text: "Go to Dashboard",
                    action: "VIEW_DASHBOARD",
                },
            });

            console.log(`👥 Welcome notification sent to new user`);
        } catch (error) {
            console.error("  Error sending user welcome notification:", error);
        }
    }

    static async notifySubscriptionActivated(companyId, planName) {
        try {
            await this.createNotification({
                recipient: companyId,
                companyId,
                type: "SUBSCRIPTION_ACTIVATED",
                title: "Subscription Activated! 🚀",
                message: `Your ${planName} plan has been activated. Enjoy all the premium features!`,
                priority: "medium",
                actionButton: {
                    text: "View Dashboard",
                    action: "VIEW_DASHBOARD",
                },
            });

            console.log(`💼 Subscription activated notification sent`);
        } catch (error) {
            console.error("  Error sending subscription notification:", error);
        }
    }

    // USERSUBTASK NOTIFICATION
    // SUB-TASK RELATED NOTIFICATIONS
    static async notifySubTaskAssigned(subTask, assignedBy) {
        try {
            // Get user IDs for assigned users
            const users = await User.find({
                name: { $in: subTask.assign },
                companyId: subTask.companyId,
            }).select("_id name");

            if (users.length === 0) return;

            const recipients = users.map((user) => user._id);
            const userNames = users.map((user) => user.name).join(", ");

            await this.createBulkNotifications({
                recipients,
                sender: assignedBy._id,
                companyId: subTask.companyId,
                type: "SUBTASK_ASSIGNED",
                title: "New Sub-Task Assigned",
                message: `You have been assigned to a new sub-task: "${subTask.title}"`,
                data: { taskId: subTask._id, projectId: subTask.projectId },
                priority: "high",
                actionButton: {
                    text: "View Sub-Task",
                    action: "VIEW_SUBTASK",
                },
            });

            console.log(
                `📋 Sub-task assignment notifications sent to: ${userNames}`
            );
        } catch (error) {
            console.error(
                "  Error sending sub-task assignment notifications:",
                error
            );
        }
    }

    static async notifySubTaskUpdated(subTask, updatedBy, updates) {
        try {
            // Get user IDs for assigned users
            const users = await User.find({
                name: { $in: subTask.assign },
                companyId: subTask.companyId,
            }).select("_id name");

            if (users.length === 0) return;

            const recipients = users.map((user) => user._id);
            const userNames = users.map((user) => user.name).join(", ");

            // Create a summary of changes
            const changes = Object.keys(updates)
                .filter(
                    (key) =>
                        !["_id", "__v", "createdAt", "updatedAt"].includes(key)
                )
                .map((key) => `${key}: ${updates[key]}`)
                .join(", ");

            await this.createBulkNotifications({
                recipients,
                sender: updatedBy._id,
                companyId: subTask.companyId,
                type: "SUBTASK_UPDATED",
                title: "Sub-Task Updated",
                message: `The sub-task "${subTask.title}" has been updated. Changes: ${changes}`,
                data: { taskId: subTask._id, projectId: subTask.projectId },
                priority: "medium",
                actionButton: {
                    text: "View Sub-Task",
                    action: "VIEW_SUBTASK",
                },
            });

            console.log(
                `📋 Sub-task update notifications sent to: ${userNames}`
            );
        } catch (error) {
            console.error(
                "  Error sending sub-task update notifications:",
                error
            );
        }
    }

    static async notifySubTaskDeleted(subTask, deletedBy) {
        try {
            // Get user IDs for assigned users
            const users = await User.find({
                name: { $in: subTask.assign },
                companyId: subTask.companyId,
            }).select("_id name");

            if (users.length === 0) return;

            const recipients = users.map((user) => user._id);
            const userNames = users.map((user) => user.name).join(", ");

            await this.createBulkNotifications({
                recipients,
                sender: deletedBy._id,
                companyId: subTask.companyId,
                type: "SUBTASK_DELETED",
                title: "Sub-Task Deleted",
                message: `The sub-task "${subTask.title}" has been deleted.`,
                data: { projectId: subTask.projectId },
                priority: "high",
                actionButton: {
                    text: "View Project",
                    action: "VIEW_PROJECT",
                },
            });

            console.log(
                `📋 Sub-task deletion notifications sent to: ${userNames}`
            );
        } catch (error) {
            console.error(
                "  Error sending sub-task deletion notifications:",
                error
            );
        }
    }

    static async notifySubTaskStatusChanged(
        subTask,
        changedBy,
        oldStatus,
        newStatus
    ) {
        try {
            // Notify both the assigner and assigned users
            const [assignedUsers, assigner] = await Promise.all([
                User.find({
                    name: { $in: subTask.assign },
                    companyId: subTask.companyId,
                }).select("_id name"),
                User.findById(subTask.assignedBy).select("_id name"),
            ]);

            const recipients = [
                ...assignedUsers.map((user) => user._id),
                assigner?._id,
            ].filter(Boolean); // Remove any undefined/null values

            if (recipients.length === 0) return;

            const userNames = [
                ...assignedUsers.map((user) => user.name),
                assigner?.name,
            ]
                .filter(Boolean)
                .join(", ");

            await this.createBulkNotifications({
                recipients,
                sender: changedBy._id,
                companyId: subTask.companyId,
                type: "SUBTASK_STATUS_CHANGED",
                title: "Sub-Task Status Changed",
                message: `Sub-task "${subTask.title}" status changed from ${oldStatus} to ${newStatus}`,
                data: { taskId: subTask._id, projectId: subTask.projectId },
                priority: "medium",
                actionButton: {
                    text: "View Sub-Task",
                    action: "VIEW_SUBTASK",
                },
            });

            console.log(
                `📋 Sub-task status change notifications sent to: ${userNames}`
            );
        } catch (error) {
            console.error(
                "  Error sending sub-task status change notifications:",
                error
            );
        }
    }

    // UTILITY METHODS
    static async cleanupOldNotifications() {
        try {
            const result = await Notification.deleteOldNotifications(30);
            console.log(
                `🧹 Cleaned up ${result.deletedCount} old notifications`
            );
            return result;
        } catch (error) {
            console.error("  Error cleaning up notifications:", error);
        }
    }

    static async getNotificationStats(companyId) {
        try {
            const stats = await Notification.aggregate([
                { $match: { companyId: mongoose.Types.ObjectId(companyId) } },
                {
                    $group: {
                        _id: "$type",
                        count: { $sum: 1 },
                        unreadCount: {
                            $sum: {
                                $cond: [{ $eq: ["$isRead", false] }, 1, 0],
                            },
                        },
                    },
                },
            ]);

            return stats;
        } catch (error) {
            console.error("  Error getting notification stats:", error);
            return [];
        }
    }
}

export { NotificationService };
