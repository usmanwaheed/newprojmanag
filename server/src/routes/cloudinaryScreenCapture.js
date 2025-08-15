import {
    getAllScreenshotsController,
    getUserScreenShot,
    getUserTrackerStatus,
    uploadScreenshotController,
} from "../controllers/snapShot.js";
import { verifyUser } from "../middleware/authMiddleware.js";
const router = Router();
import { Router } from "express";
import { upload } from "../middleware/multerMiddleware.js";

// Cloudinary Screenshot Upload
router.post(
    "/upload-screenshot",
    verifyUser(["admin", "user", "QcAdmin"]),
    upload.single("image"),
    uploadScreenshotController
);
router.get(
    "/get-user-screenshots",
    verifyUser(["admin", "user"]),
    getUserScreenShot
);
router.get(
    "/get-all-screenshots",
    verifyUser(["admin", "user"]),
    getAllScreenshotsController
);
router.get(
    "/check-status",
    verifyUser(["user", "admin"]),
    getUserTrackerStatus
);

export default router;
