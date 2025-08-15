import { Router } from "express";
import {
    completeUserSubTask,
    createUserTask,
    deleteDocsSubTask,
    deleteUserSubTask,
    deleteVideoSubTask,
    docsSubTask,
    fetchDocsSubTasks,
    fetchVideoSubTasks,
    filterSubTask,
    getCompleteUserSubTask,
    getUserForSubTask,
    getUserSubTask,
    subTaskApproval,
    updateUserSubTask,
    videosSubTask,
} from "../controllers/subUserTask.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { ROLES } from "../config/roles.js";

const router = Router();

router
    .route("/create-subTask")
    .post(
        verifyUser([ROLES.QCADMIN, ROLES.USER, ROLES.COMPANY]),
        createUserTask
    );

router
    .route("/get-subTask")
    .get(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        getUserSubTask
    );

router
    .route("/complete-subTask/:taskID")
    .patch(
        verifyUser([ROLES.QCADMIN, ROLES.USER, ROLES.COMPANY]),
        completeUserSubTask
    );

router
    .route("/get-complete-subTask")
    .get(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        getCompleteUserSubTask
    );

router
    .route("/approve-subTask/:taskID")
    .patch(verifyUser([ROLES.QCADMIN, ROLES.COMPANY]), subTaskApproval);

router
    .route("/delete-subTask/:taskId")
    .delete(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        deleteUserSubTask
    );

router
    .route("/update-subTask/:taskId")
    .put(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        updateUserSubTask
    );

router
    .route("/get-userOfSubTask/:projectId")
    .get(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        getUserForSubTask
    );

router
    .route("/search-subTask")
    .get(verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]), filterSubTask);

// Create Docs Link In User SubTask Routes
router
    .route("/create-docslink")
    .post(verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]), docsSubTask);

router
    .route("/fetch-docslink")
    .get(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        fetchDocsSubTasks
    );

router
    .route("/delete-docslink/:id")
    .delete(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        deleteDocsSubTask
    );

// Create Video Link In User SubTask Routes
router
    .route("/create-videolink")
    .post(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        videosSubTask
    );

router
    .route("/fetch-videolink")
    .get(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        fetchVideoSubTasks
    );

router
    .route("/delete-videolink/:id")
    .delete(
        verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
        deleteVideoSubTask
    );

export default router;
