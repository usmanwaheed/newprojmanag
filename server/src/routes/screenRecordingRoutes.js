import { Router } from "express";
import {
    verifyUser,
    verifyCompany,
    verifyCompanyUser,
} from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multerMiddleware.js";
import { ROLES } from "../config/roles.js";

import {
    startRecordingSession,
    updateRecordingStatus,
    uploadRecording,
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
} from "../controllers/screenRecordingController.js";

const router = Router();

// ==================== RECORDING SESSION MANAGEMENT ====================

// Start a new recording session - Company users only
router.route("/start-session").post(verifyUser(), startRecordingSession);

// Update recording status (pause/resume/stop) - Company users only
router
    .route("/update-status/:sessionId")
    .put(verifyCompanyUser(), updateRecordingStatus);

// Upload recorded video - Company users only
router
    .route("/upload/:sessionId")
    .post(verifyCompanyUser(), upload.single("video"), uploadRecording);

// ==================== RECORDING RETRIEVAL ====================

// Get current user's recordings - Company users only
router.route("/my-recordings").get(verifyCompanyUser(), getUserRecordings);

// Get all company recordings - Company owners and QC admins only
router
    .route("/company-recordings")
    .get(
        verifyUser([ROLES.COMPANY, ROLES.QCADMIN, ROLES.USER]),
        getCompanyRecordings
    );

// Get pending approvals - Company owners and QC admins only
router
    .route("/pending-approvals")
    .get(verifyUser([ROLES.COMPANY, ROLES.QCADMIN]), getPendingApprovals);

// Get single recording by ID - Company users only
router.route("/recording/:id").get(verifyCompanyUser(), getRecordingById);

// ==================== RECORDING APPROVAL WORKFLOW ====================

// Approve recording - Company owners and QC admins only
router
    .route("/approve/:id")
    .put(verifyUser([ROLES.COMPANY, ROLES.QCADMIN]), approveRecording);

// Reject recording - Company owners and QC admins only
router
    .route("/reject/:id")
    .put(verifyUser([ROLES.COMPANY, ROLES.QCADMIN]), rejectRecording);

// ==================== RECORDING MANAGEMENT ====================

// Update recording details (title, description, tags) - Company users only
router.route("/update/:id").put(verifyCompanyUser(), updateRecording);

// Delete recording - Company users (owner) and company owners only
router.route("/delete/:id").delete(verifyCompanyUser(), deleteRecording);

// ==================== RECORDING INTERACTIONS ====================

// Add comment to recording - Company users only
router.route("/comment/:id").post(verifyCompanyUser(), addComment);

// ==================== ANALYTICS ====================

// Get recording analytics - Company owners only
router.route("/analytics").get(verifyCompany(), getRecordingAnalytics);

// ==================== ADDITIONAL UTILITY ROUTES ====================

// Get recordings by approval status - Company users only
router
    .route("/status/:approvalStatus")
    .get(verifyCompanyUser(), getUserRecordings);

// Get recordings by specific user (for company owners) - Company owners and QC admins only
router
    .route("/user/:userId")
    .get(verifyUser([ROLES.COMPANY, ROLES.QCADMIN]), getCompanyRecordings);

// Search recordings by title or description - Company users only
router.route("/search").get(verifyCompanyUser(), getUserRecordings);

// ==================== BULK OPERATIONS ====================

// Bulk approve recordings - Company owners and QC admins only
router
    .route("/bulk-approve")
    .put(verifyUser([ROLES.COMPANY, ROLES.QCADMIN]), async (req, res) => {
        // This would need to be implemented in the controller
        res.status(501).json({
            message: "Bulk approve functionality not yet implemented",
        });
    });

// Bulk reject recordings - Company owners and QC admins only
router
    .route("/bulk-reject")
    .put(verifyUser([ROLES.COMPANY, ROLES.QCADMIN]), async (req, res) => {
        // This would need to be implemented in the controller
        res.status(501).json({
            message: "Bulk reject functionality not yet implemented",
        });
    });

// ==================== EXPORT ROUTES ====================

// Export recording data - Company owners only
router.route("/export").get(verifyCompany(), async (req, res) => {
    // This would need to be implemented in the controller
    res.status(501).json({
        message: "Export functionality not yet implemented",
    });
});

export default router;
