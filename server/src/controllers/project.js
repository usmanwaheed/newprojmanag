import mongoose from "mongoose";
import { User } from "../models/userModel.js";
import { adminTask } from "../models/adminTask.js";
import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Project } from "../models/project.js";
import { doscSubTask } from "../models/Docs_SubTask/docs_Subtask.js";
import { videoSubTask } from "../models/Video_SubTask/video_Subtask.js";
import { ROLES } from "../config/roles.js";
import { NotificationService } from "../utils/notificationService.js";

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

// Helper function to validate project belongs to company
const validateProjectCompany = async (projectId, companyId) => {
    const project = await adminTask.findOne({ _id: projectId, companyId });
    if (!project) {
        throw new apiError(403, "Project not found or access denied");
    }
    return project;
};

// Create User Sub Task inside Project

// Create User Sub Task inside Project
const createUserTask = asyncHandler(async (req, res) => {
    const {
        title,
        assign,
        description,
        dueDate,
        startDate,
        taskList,
        points,
        projectId,
    } = req.body;

    if (
        [title, assign, description, projectId].some(
            (fields) => !fields?.trim()
        )
    ) {
        throw new apiError(400, "All fields are required.");
    }

    const userId = req.user._id;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to create subtasks.");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const teamLeadArray = assign.split(",").map((name) => name.trim());
    const tasks = [];

    // Verify that all assigned users exist and belong to the same company
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

    const newTask = new Project({
        title,
        assign: tasks,
        description,
        dueDate,
        startDate,
        taskList,
        points,
        assignedBy: userId,
        projectId,
        companyId,
    });

    await newTask.save();

    const savedTask = await Project
        .findById(newTask._id)
        .populate("assignedBy", "name avatar");

    // Send notifications AFTER task is saved successfully
    try {
        await NotificationService.notifySubTaskAssigned(savedTask, req.user);
        console.log("Assignment notifications sent successfully");
    } catch (notificationError) {
        console.error(
            "Failed to send assignment notifications:",
            notificationError
        );
        // Don't fail the request if notifications fail
    }

    return res
        .status(200)
        .json(new apiResponse(200, savedTask, "Task created successfully."));
});

// Get User Sub Task inside Project
const getUserSubTask = asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch subtasks.");
    }

    if (!mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid Project ID");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const tasks = await Project.getSubTasksForProjectAndCompany(
        projectId,
        companyId
    );

    if (!tasks || tasks.length === 0) {
        return res.status(200).json(new apiResponse(200, [], "No tasks found"));
    }

    return res
        .status(200)
        .json(new apiResponse(200, tasks, "Tasks fetched successfully"));
});

// Get Users From Assigned Sub Tasks
const getUserForSubTask = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch users.");
    }

    if (!mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid Project ID");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const assignedUsers =
        await Project.getAssignedUsersForProjectAndCompany(
            projectId,
            companyId
        );

    if (assignedUsers.length <= 0) {
        return res
            .status(200)
            .json(new apiResponse(200, [], "No assigned task members found"));
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, assignedUsers, "Users fetched successfully")
        );
});

// Delete User Sub Task for Project
const deleteUserSubTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const companyId = getUserCompanyId(req.user);
    const { id } = req.params;

    const subtask = await Project.findById(id);

    // Send deletion notifications before deleting
    await NotificationService.notifySubTaskDeleted(subtask, req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to delete subtasks.");
    }

    if (!taskId) {
        throw new apiError(400, "TaskId is required");
    }

    // Only allow deletion of subtasks that belong to the user's company
    const deleteTask = await Project.findOneAndDelete({
        _id: taskId,
        companyId: companyId,
    });

    if (!deleteTask) {
        throw new apiError(400, "No task found to delete or access denied");
    }

    return res
        .status(200)
        .json(new apiResponse(200, deleteTask, "Task Deleted Successfully"));
});

// Update User Sub Task for Project
const updateUserSubTask = asyncHandler(async (req, res) => {
    const taskId = req.params.taskId;
    const companyId = getUserCompanyId(req.user);

    const { id } = req.params;
    const updates = req.body;

    const subtask = await Project.findByIdAndUpdate(id, updates, {
        new: true,
    });

    // Send update notifications
    await NotificationService.notifySubTaskUpdated(subtask, req.user, updates);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to update subtasks.");
    }

    if (!mongoose.isValidObjectId(taskId)) {
        throw new apiError(400, "Invalid Task ID format");
    }

    const existingTask = await Project.findOne({
        _id: taskId,
        companyId: companyId,
    });

    if (!existingTask) {
        throw new apiError(400, "Task not found or access denied");
    }

    // Check if user is assigned to this task (prevent self-editing)
    const mentionedUser = req.user.name;
    const isUserAssigned = existingTask.assign.some((user) => {
        return user.toString() === mentionedUser.toString();
    });

    if (isUserAssigned) {
        throw new apiError(
            403,
            "You are not allowed to update this task because you are assigned to it."
        );
    }

    const { title, assign, description, taskList, points } = req.body;
    const teamLeadArray =
        assign && typeof assign === "string"
            ? assign.split(",").map((name) => name.trim())
            : existingTask.assign;

    const tasks = [];
    if (teamLeadArray) {
        // Verify that all assigned users exist and belong to the same company
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

    const updateTask = await Project
        .findByIdAndUpdate(
            taskId,
            {
                title: title || existingTask.title,
                assign: tasks || existingTask.assign,
                description: description || existingTask.description,
                taskList: taskList || existingTask.taskList,
                points: points || existingTask.points,
            },
            { new: true, runValidators: true }
        )
        .populate("assignedBy", "name avatar");

    if (!updateTask) {
        throw new apiError(400, "Task not found");
    }

    return res
        .status(200)
        .json(new apiResponse(200, updateTask, "Task Updated Successfully"));
});

// Complete User Sub Task for Project
const completeUserSubTask = asyncHandler(async (req, res) => {
    const { taskID } = req.params;
    const userId = req.user.name;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to complete subtasks.");
    }

    if (!mongoose.isValidObjectId(taskID)) {
        throw new apiError(400, "Task ID not valid");
    }

    const getTaskId = await Project
        .findOne({ _id: taskID, companyId })
        .select("taskList assign");

    if (!getTaskId) {
        throw new apiError(400, "Task not found or access denied");
    }

    const userInAssign = getTaskId.assign.includes(userId.toString());
    if (!userInAssign) {
        throw new apiError(403, "You cannot perform this action");
    }

    if (getTaskId.taskList === "completed") {
        throw new apiError(400, "The task is already completed");
    }

    getTaskId.taskList = "completed";
    await getTaskId.save();

    res.status(200).json(
        new apiResponse(200, getTaskId, "Task marked completed successfully")
    );
});

// Get Completed User Sub Tasks
const getCompleteUserSubTask = asyncHandler(async (req, res) => {
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(
            400,
            "Company ID is required to fetch completed subtasks."
        );
    }

    const completedTasks =
        await Project.getCompletedSubTasksForCompany(companyId);

    if (!completedTasks || completedTasks.length === 0) {
        return res
            .status(200)
            .json(new apiResponse(200, [], "No completed tasks found"));
    }

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                completedTasks,
                "Completed tasks fetched successfully"
            )
        );
});

// Sub Task Approval
const subTaskApproval = asyncHandler(async (req, res) => {
    const { status } = req.body;
    const { taskID } = req.params;
    const userRole = req.user.role;
    const companyId = getUserCompanyId(req.user);

    const { id } = req.params;

    const subtask = await Project.findById(id);
    const oldStatus = subtask.status;

    if (!companyId) {
        throw new apiError(400, "Company ID is required to approve subtasks.");
    }

    if (userRole !== ROLES.ADMIN && userRole !== ROLES.QCADMIN) {
        throw new apiError(
            400,
            "You are not authorized to perform this action"
        );
    }

    if (!mongoose.isValidObjectId(taskID)) {
        throw new apiError(400, "Task ID not valid");
    }

    const approveTask = await Project
        .findOne({
            _id: taskID,
            companyId: companyId,
        })
        .select("taskList");

    if (!approveTask) {
        throw new apiError(400, "Task not found or access denied");
    }

    if (status === "approved") {
        if (approveTask.taskList === "approved") {
            return res
                .status(200)
                .json(
                    new apiResponse(
                        200,
                        approveTask,
                        "The Task is already approved"
                    )
                );
        }
        approveTask.taskList = "approved";
    } else if (status === "progress") {
        if (approveTask.taskList === "progress") {
            return res
                .status(200)
                .json(
                    new apiResponse(
                        200,
                        approveTask,
                        "The Task is already in progress"
                    )
                );
        }
        approveTask.taskList = "progress";
    } else {
        throw new apiError(400, "Invalid status. Use 'approved' or 'progress'");
    }

    await approveTask.save();

    // Send status change notifications
    await NotificationService.notifySubTaskStatusChanged(
        subtask,
        req.user,
        oldStatus,
        status
    );
    res.status(200).json(
        new apiResponse(200, approveTask, "Task status updated successfully")
    );
});

// Filtering the SubTask Data
const filterSubTask = asyncHandler(async (req, res) => {
    const { searchText, filterField, projectId } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to filter subtasks.");
    }

    if (!projectId || !mongoose.isValidObjectId(projectId)) {
        throw new apiError(400, "Invalid or missing projectId");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const query = { projectId };

    if (filterField && searchText) {
        query[filterField] = { $regex: searchText, $options: "i" };
    }

    const result = await Project.filterSubTasksForCompany(query, companyId);

    res.status(200).json(
        new apiResponse(200, result, "Data fetched successfully.")
    );
});

// ----------- DOCS and VIDEOS Links Controllers -------------
// Create Docs SubTask Links
const docsSubTask = asyncHandler(async (req, res) => {
    const { title, link, projectId } = req.body;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to create docs links.");
    }

    if ([title, link, projectId].some((fields) => !fields)) {
        throw new apiError(400, "All fields are required.");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const createDocs = await doscSubTask.create({
        title,
        link,
        projectId,
        companyId, // Add company ID to docs as well
    });

    return res
        .status(200)
        .json(
            new apiResponse(200, createDocs, "Docs Link Created Successfully!")
        );
});

// Fetch Docs SubTask Links
const fetchDocsSubTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch docs links.");
    }

    if (!projectId) {
        throw new apiError(400, "Project ID is required.");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const docs = await doscSubTask.find({ projectId, companyId });

    if (!docs || docs.length === 0) {
        return res
            .status(200)
            .json(new apiResponse(200, [], "No uploaded links yet"));
    }

    return res
        .status(200)
        .json(new apiResponse(200, docs, "Docs fetched successfully!"));
});

// Delete Docs SubTask Links
const deleteDocsSubTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to delete docs links.");
    }

    if (!id) {
        throw new apiError(400, "Link ID is required to delete");
    }

    const deleteDocs = await doscSubTask.findOneAndDelete({
        _id: id,
        companyId: companyId,
    });

    if (!deleteDocs) {
        throw new apiError(400, "No link found to delete or access denied");
    }

    return res
        .status(200)
        .json(
            new apiResponse(200, deleteDocs, "Docs Link Deleted Successfully!")
        );
});

// ----------- Videos Links Controllers -------------
const videosSubTask = asyncHandler(async (req, res) => {
    const { title, video, projectId } = req.body;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(
            400,
            "Company ID is required to create video links."
        );
    }

    if ([title, video, projectId].some((fields) => !fields)) {
        throw new apiError(400, "All fields are required.");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const createVideo = await videoSubTask.create({
        title,
        video,
        projectId,
        companyId, // Add company ID to videos as well
    });

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                createVideo,
                "Video Link Created Successfully!"
            )
        );
});

// Fetch Video SubTask Links
const fetchVideoSubTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.query;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(400, "Company ID is required to fetch video links.");
    }

    if (!projectId) {
        throw new apiError(400, "Project ID is required.");
    }

    // Validate that the project belongs to the user's company
    await validateProjectCompany(projectId, companyId);

    const videos = await videoSubTask.find({ projectId, companyId });

    if (!videos || videos.length === 0) {
        return res
            .status(200)
            .json(new apiResponse(200, [], "No uploaded links yet"));
    }

    return res
        .status(200)
        .json(new apiResponse(200, videos, "Videos fetched successfully!"));
});

// Delete Video SubTask Links
const deleteVideoSubTask = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const companyId = getUserCompanyId(req.user);

    if (!companyId) {
        throw new apiError(
            400,
            "Company ID is required to delete video links."
        );
    }

    if (!id) {
        throw new apiError(400, "Video Link ID is required to delete");
    }

    const deleteVideo = await videoSubTask.findOneAndDelete({
        _id: id,
        companyId: companyId,
    });

    if (!deleteVideo) {
        throw new apiError(400, "No link found to delete or access denied");
    }

    return res
        .status(200)
        .json(
            new apiResponse(
                200,
                deleteVideo,
                "Video Link Deleted Successfully!"
            )
        );
});

export {
    createUserTask,
    getUserSubTask,
    deleteUserSubTask,
    updateUserSubTask,
    getCompleteUserSubTask,
    completeUserSubTask,
    subTaskApproval,
    getUserForSubTask,
    filterSubTask,

    // Docs SubTask Links
    docsSubTask,
    deleteDocsSubTask,
    fetchDocsSubTasks,

    // Video SubTask Links
    videosSubTask,
    fetchVideoSubTasks,
    deleteVideoSubTask,
};
