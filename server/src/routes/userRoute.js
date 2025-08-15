import { Router } from "express";
import {
    verifyUser,
    verifyCompany,
    verifyCompanyUser,
} from "../middleware/authMiddleware.js";

import {
    refreshAccessToken,
    getAllData,
    logoutUser,
    registerUser,
    loginUser,
    getUserData,
    getUserProfile,
    promoteUser,
    updateUser,
    getTeamUserProfile,
    getUserPlanDetails,
    getCompanyUsers,
    checkExpiredCompanies,
    updateCompanyLogo,
    getCompanyLogo,
    getCompanyUsersWithPlanStatus,
    checkFeatureAccess,
    getPlanUsageStats,
} from "../controllers/userController.js";

import { upload } from "../middleware/multerMiddleware.js";
import { validateRegisterFields } from "../controllers/validations/authValidation.js";
import {
    deletePdfController,
    getAllPdfController,
    uploadPdfController,
} from "../controllers/cloudinaryUploads/pdfUpload.js";

const router = Router();

// Authentication routes
router
    .route("/signup")
    .post(
        validateRegisterFields([
            "name",
            "email",
            "password",
            "confirmPassword",
            "role",
        ]),
        registerUser
    );

router.route("/login").post(loginUser);
router.route("/logout").post(verifyUser(), logoutUser);

// User data routes
router.route("/get-user-data").get(verifyUser(), getUserData);
router
    .route("/get-profile-data")
    .get(verifyUser(["company", "user", "QcAdmin"]), getUserProfile);

router
    .route("/get-user-data/:id")
    .get(verifyUser(["company", "user", "QcAdmin"]), getTeamUserProfile);

router.put(
    "/update-user",
    verifyUser(["company", "user", "QcAdmin"]),
    upload.single("profilePicture"),
    updateUser
);

// Company-specific routes
router.route("/get-company-users").get(verifyCompany(), getCompanyUsers);
router.route("/promote-user").post(verifyCompany(), promoteUser);
router.route("/get-plan-details").get(verifyCompany(), getUserPlanDetails);

// Admin routes
router.route("/get-data").get(verifyUser(["superadmin"]), getAllData);
router
    .route("/check-expired-companies")
    .post(verifyUser(["superadmin"]), checkExpiredCompanies);

// Token refresh
router.route("/refresh-token").post(refreshAccessToken);

// PDF upload routes (company users only)
router
    .route("/upload-pdf")
    .post(verifyCompanyUser(), upload.single("pdf"), uploadPdfController);
router.route("/get-all-pdfs").get(verifyCompanyUser(), getAllPdfController);
router
    .route("/delete-pdf/:id")
    .delete(verifyCompanyUser(), deletePdfController);

// Company Logo
router.put(
    "/update-company-logo",
    verifyCompany(),
    upload.single("logo"),
    updateCompanyLogo
);

router.get(
    "/company-logo/:companyId",
    verifyUser(["company", "user", "QcAdmin"]),
    getCompanyLogo
);

// Get company users with their plan access status (Company only)
router
    .route("/get-company-users-with-plan")
    .get(verifyCompany(), getCompanyUsersWithPlanStatus);
// Get plan usage statistics (Company only)
router.route("/get-plan-usage").get(verifyCompany(), getPlanUsageStats);
// Check access to specific feature - Works for both companies and users
router
    .route("/check-feature-access/:feature")
    .get(verifyUser(["company", "user"]), checkFeatureAccess);

// Testing routes
router.route("/testing").get(verifyUser(["company", "user"]), getUserProfile);

export default router;
