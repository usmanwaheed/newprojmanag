import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import { apiError } from "../utils/apiError.js";
import { adminTask } from "../models/adminTask.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
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

// Creating a Task
const createTask = asyncHandler(async (req, res) => {
    const {
        projectTitle,
        teamLeadName,
        description,
        projectStatus,
        startDate,
        dueDate,
        budget,
        link,
    } = req.body;

    if (
        [projectTitle, teamLeadName, description, dueDate].some(
            (fields) => !fields?.trim()
        )
    ) {
        throw new apiError(400, "All fields are required.");
    }

    const adminId = req.user._id;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to create tasks.");
    }

    if (!budget) {
        throw new apiError(400, "Budget is required.");
    }

    const teamLeadArray = teamLeadName.split(",").map((name) => name.trim());
    const tasks = [];

    // Verify that all team leads exist and belong to the same company
    for (const teamLead of teamLeadArray) {
        const user = await User.findOne({
            name: teamLead,
            $or: [
                { _id: companyId }, // If it's the company itself
                { companyId: companyId }, // If it's a user of the company
            ],
        });

        if (!user) {
            throw new apiError(
                400,
                `Username '${teamLead}' is not found in your company`
            );
        }
        tasks.push(teamLead);
    }

    const newTask = new adminTask({
        projectTitle,
        teamLeadName: tasks,
        description,
        projectStatus,
        startDate,
        dueDate,
        budget,
        link,
        assignedBy: adminId,
        companyId: companyId, // Link task to company
        members: tasks.length,
    });

    await newTask.save();
    const savedTask = await adminTask
        .findById(newTask._id)
        .populate("assignedBy", "name avatar");

    // Send task assignment notifications
    try {
        await NotificationService.notifyTaskAssigned(
            savedTask._id,
            tasks, // teamLeadName array
            adminId, // assignedBy
            companyId
        );
        console.log("Task assignment notifications sent successfully");
    } catch (error) {
        console.error("Error sending task assignment notifications:", error);
        // Don't throw error here as task is already created
    }

    return res
        .status(200)
        .json(new apiResponse(200, savedTask, "Task created successfully."));
});

// Getting the data of the Task (company-specific)
const getCreateTask = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch tasks.");
    }

    // Only fetch tasks that belong to the user's company
    const tasks = await adminTask.getTasksForCompany(companyId);

    if (!tasks || tasks.length === 0) {
        return res.status(200).json(new apiResponse(200, [], "No task found"));
    }

    return res
        .status(200)
        .json(new apiResponse(200, tasks, "Tasks fetched successfully"));
});

// Deleting the data of the Task (company-specific)
const DeleteTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const companyId = getUserCompanyId(req.user);

    if (!taskId) {
        throw new apiError(400, "TaskId is required");
    }

    if (!companyId) {
        throw new apiError(400, "Company ID is required to delete tasks.");
    }

    // Get task details before deletion for notifications
    const taskToDelete = await adminTask.findOne({
        _id: taskId,
        companyId: companyId,
    });

    if (!taskToDelete) {
        throw new apiError(400, "No task found to delete or access denied");
    }

    // Delete the task
    const deleteTask = await adminTask.findOneAndDelete({
        _id: taskId,
        companyId: companyId,
    });

    // Send task deletion notifications to assigned users
    try {
        const assignedUsers = taskToDelete.teamLeadName || [];
        if (assignedUsers.length > 0) {
            // Get user IDs for assigned users
            const users = await User.find({
                name: { $in: assignedUsers },
                companyId: companyId,
            }).select("_id name");

            const recipients = users.map((user) => user._id);

            if (recipients.length > 0) {
                await NotificationService.createBulkNotifications({
                    recipients,
                    sender: req.user._id,
                    companyId,
                    type: "TASK_DELETED",
                    title: "Task Deleted",
                    message: `The task "${taskToDelete.projectTitle}" has been deleted.`,
                    data: { taskId: taskToDelete._id },
                    priority: "medium",
                });
            }
        }
        console.log("Task deletion notifications sent successfully");
    } catch (error) {
        console.error("Error sending task deletion notifications:", error);
    }

    return res
        .status(200)
        .json(new apiResponse(200, deleteTask, "Task Deleted Successfully"));
});

// Updating the Task (company-specific)
const UpdateTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const companyId = getUserCompanyId(req.user);

    if (!mongoose.isValidObjectId(taskId)) {
        throw new apiError(400, "Invalid Task ID format");
    }

    if (!companyId) {
        throw new apiError(400, "Company ID is required to update tasks.");
    }

    // Only allow updating tasks that belong to the user's company
    const existingTask = await adminTask.findOne({
        _id: taskId,
        companyId: companyId,
    });

    if (!existingTask) {
        throw new apiError(400, "Task not found or access denied");
    }

    const { projectTitle, teamLeadName, description, projectStatus, points } =
        req.body;

    const teamLeadArray =
        teamLeadName && typeof teamLeadName === "string"
            ? teamLeadName.split(",").map((name) => name.trim())
            : existingTask.teamLeadName;

    const tasks = [];
    if (teamLeadArray) {
        // Verify that all team leads exist and belong to the same company
        for (const teamLead of teamLeadArray) {
            const user = await User.findOne({
                name: teamLead,
                $or: [
                    { _id: companyId }, // If it's the company itself
                    { companyId: companyId }, // If it's a user of the company
                ],
            });

            if (!user) {
                throw new apiError(
                    400,
                    `Username '${teamLead}' is not found in your company`
                );
            }
            tasks.push(teamLead);
        }
    }

    const updateTask = await adminTask
        .findByIdAndUpdate(
            taskId,
            {
                projectTitle: projectTitle || existingTask.projectTitle,
                teamLeadName: tasks || existingTask.teamLeadName,
                description: description || existingTask.description,
                projectStatus: projectStatus || existingTask.projectStatus,
                points: points || existingTask.points,
            },
            { new: true, runValidators: true }
        )
        .populate("assignedBy", "name avatar");

    if (!updateTask) {
        throw new apiError(400, "Task not found");
    }

    // Send task update notifications
    try {
        const assignedUsers = updateTask.teamLeadName || [];
        if (assignedUsers.length > 0) {
            // Get user IDs for assigned users
            const users = await User.find({
                name: { $in: assignedUsers },
                companyId: companyId,
            }).select("_id name");

            const recipients = users.map((user) => user._id);

            if (recipients.length > 0) {
                // Create a summary of changes
                const changes = [];
                if (
                    projectTitle &&
                    projectTitle !== existingTask.projectTitle
                ) {
                    changes.push(`title: ${projectTitle}`);
                }
                if (description && description !== existingTask.description) {
                    changes.push(`description updated`);
                }
                if (
                    projectStatus &&
                    projectStatus !== existingTask.projectStatus
                ) {
                    changes.push(`status: ${projectStatus}`);
                }
                if (
                    teamLeadName &&
                    JSON.stringify(tasks) !==
                        JSON.stringify(existingTask.teamLeadName)
                ) {
                    changes.push(`team members updated`);
                }

                const changesSummary =
                    changes.length > 0
                        ? changes.join(", ")
                        : "Task details updated";

                await NotificationService.createBulkNotifications({
                    recipients,
                    sender: req.user._id,
                    companyId,
                    type: "TASK_UPDATED",
                    title: "Task Updated",
                    message: `The task "${updateTask.projectTitle}" has been updated. Changes: ${changesSummary}`,
                    data: { taskId: updateTask._id },
                    priority: "medium",
                    actionButton: {
                        text: "View Task",
                        action: "VIEW_TASK",
                    },
                });
            }
        }
        console.log("Task update notifications sent successfully");
    } catch (error) {
        console.error("Error sending task update notifications:", error);
    }

    return res
        .status(200)
        .json(new apiResponse(200, updateTask, "Task Updated Successfully"));
});

// Getting a Single Task by ID (company-specific)
const getCreateTaskById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch task.");
    }

    // Only fetch task if it belongs to the user's company
    const task = await adminTask.getTaskByIdAndCompany(id, companyId);

    if (!task) {
        throw new apiError(400, "Task not found or access denied");
    }

    return res
        .status(200)
        .json(new apiResponse(200, task, "Task fetched successfully"));
});

// Updating the Task Status (company-specific)
const submitTask = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to submit tasks.");
    }

    // Only allow status update for tasks that belong to the user's company
    const task = await adminTask.findOne({
        _id: taskId,
        companyId: companyId,
    });

    if (!task) {
        throw new apiError(400, "Task not found or access denied");
    }

    const oldStatus = task.status;
    task.status = status;
    await task.save();

    // Send task status change notification
    try {
        await NotificationService.notifyTaskStatusChanged(
            taskId,
            status,
            req.user._id, // changedBy
            companyId
        );
        console.log("Task status change notification sent successfully");
    } catch (error) {
        console.error("Error sending task status change notification:", error);
    }

    res.status(200).json(new apiResponse(200, task, "Task Status Updated"));
});

// Project Approval or Disapproval (company-specific)
const projectApproval = asyncHandler(async (req, res) => {
    const { taskId } = req.params;
    const { projectStatus } = req.body;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to approve tasks.");
    }

    // Only allow approval for tasks that belong to the user's company
    const task = await adminTask
        .findOneAndUpdate(
            {
                _id: taskId,
                companyId: companyId,
            },
            { projectStatus },
            { new: true }
        )
        .populate("assignedBy", "name avatar");

    if (!task) {
        throw new apiError(400, "Task not found or access denied");
    }

    // Send task approval/rejection notification
    try {
        await NotificationService.notifyTaskApprovalStatusChanged(
            taskId,
            projectStatus,
            req.user._id,
            companyId
        );
        console.log("Task approval notification sent successfully");
    } catch (error) {
        console.error("Error sending task approval notification:", error);
    }

    res.status(200).json(
        new apiResponse(200, task, `Task ${projectStatus} successfully`)
    );
});

// Get tasks assigned to current user (for users to see their assigned tasks)
const getMyAssignedTasks = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);
    const userName = req.user.name;

    if (!companyId) {
        throw new apiError(
            400,
            "Company ID is required to fetch assigned tasks."
        );
    }

    // Find tasks where the user is mentioned in teamLeadName and belongs to the same company
    const tasks = await adminTask
        .find({
            companyId: companyId,
            teamLeadName: { $in: [userName] },
        })
        .populate("assignedBy", "name avatar");

    return res
        .status(200)
        .json(
            new apiResponse(200, tasks, "Assigned tasks fetched successfully")
        );
});

export {
    createTask,
    getCreateTask,
    DeleteTask,
    UpdateTask,
    getCreateTaskById,
    submitTask,
    projectApproval,
    getMyAssignedTasks,
};
