import { Router } from "express";
import {
    deleteVideoController,
    getAllVideoController,
    getSingleVideoController,
    searchVideosController,
    uploadVideoController,
} from "../controllers/cloudinaryUploads/videoUpload.js";

import {
    deletePdfController,
    getAllPdfController,
    searchPdfsController,
    uploadPdfController,
} from "../controllers/cloudinaryUploads/pdfUpload.js";

import { verifyUser } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/multerMiddleware.js";
import { ROLES } from "../config/roles.js";
const router = Router();

// Cloudinary Video Routes
router.post(
    "/video-upload",
    verifyUser([ROLES.QCADMIN, ROLES.COMPANY, ROLES.USER]),
    upload.single("video"),
    uploadVideoController
);

router.get(
    "/get-video-upload",
    verifyUser([ROLES.USER, ROLES.QCADMIN, ROLES.COMPANY]),
    getAllVideoController
);

router.get(
    "/get-single-video-upload/:videoId",
    verifyUser([ROLES.USER, ROLES.QCADMIN, ROLES.COMPANY]),
    getSingleVideoController
);

router.get(
    "/search-videos",
    verifyUser([ROLES.USER, ROLES.QCADMIN, ROLES.COMPANY]),
    searchVideosController
);

router.delete(
    "/delete-video/:videoId",
    verifyUser([ROLES.QCADMIN, ROLES.COMPANY]),
    deleteVideoController
);

// PDF Routes
router.post(
    "/pdf-upload",
    verifyUser([ROLES.USER, ROLES.QCADMIN, ROLES.COMPANY]),
    upload.single("pdf"),
    uploadPdfController
);

router.delete(
    "/delete-pdf/:id",
    verifyUser([ROLES.QCADMIN, ROLES.COMPANY]),
    deletePdfController
);

router.get(
    "/get-all-pdfs",
    verifyUser([ROLES.USER, ROLES.QCADMIN, ROLES.COMPANY]),
    getAllPdfController
);

router.get(
    "/search-pdfs",
    verifyUser([ROLES.USER, ROLES.QCADMIN, ROLES.COMPANY]),
    searchPdfsController
);

export default router;
