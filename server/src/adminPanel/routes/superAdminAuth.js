const router = Router();
import { Router } from "express";
import {
    getAdminData,
    loginSuperAdmin,
    logoutAdmin,
    refreshAccessAdminToken,
    updateAdmin,
} from "../../controllers/superAdmin/Auth.js";
import { verifyUser } from "../../middleware/authMiddleware.js";

router.route("/login").post(loginSuperAdmin);
router.route("/get-admin-data").get(verifyUser(), getAdminData);
router.route("/logout").post(verifyUser(), logoutAdmin);
router.patch("/users/:id/update", verifyUser("superadmin"), updateAdmin);
router.route("/refresh-token").post(refreshAccessAdminToken);

export default router;
