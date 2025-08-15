import { Router } from "express";
import {
    createTask,
    getCreateTask,
    DeleteTask,
    UpdateTask,
    getCreateTaskById,
    submitTask,
    projectApproval,
    getMyAssignedTasks,
} from "../controllers/adminTask.js";
import { verifyUser, verifyCompany } from "../middleware/authMiddleware.js";
import { ROLES } from "../config/roles.js";

const router = Router();

// Create Task - Only companies can create tasks
router.route("/create-task").post(verifyCompany(), createTask);

// Get all tasks for the company - Company users and regular users can view
router
    .route("/get-create-task")
    .get(verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]), getCreateTask);

// Delete Task - Only companies can delete their tasks
router.route("/get-delete-task/:taskId").delete(verifyCompany(), DeleteTask);

// Update Task - Only companies can update their tasks
router.route("/get-update-task/:taskId").put(verifyCompany(), UpdateTask);

// Get single task by ID - Company users and regular users can view
router
    .route("/get-create-task/:id")
    .get(
        verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]),
        getCreateTaskById
    );

// Submit Task - Users can submit their assigned tasks
router
    .route("/submit-task/:taskId")
    .put(verifyUser([ROLES.COMPANY, ROLES.USER, ROLES.QCADMIN]), submitTask);

// Project Approval - Only companies can approve/disapprove tasks
router.route("/project-approval/:taskId").put(verifyCompany(), projectApproval);

// Get tasks assigned to current user - Users can see their assigned tasks
router
    .route("/my-assigned-tasks")
    .get(verifyUser([ROLES.USER, ROLES.QCADMIN]), getMyAssignedTasks);

export default router;
