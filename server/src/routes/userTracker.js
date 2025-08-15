import { Router } from "express";
import {
    getElapsedTime,
    checkIn,
    checkOut,
    pauseOrResume,
    getUserTimeProject,
    getUsersTimeProject,
    getCompanyDashboard,
} from "../controllers/trackerTime.js";
import { verifyUser } from "../middleware/authMiddleware.js";
import { ROLES } from "../config/roles.js";

const router = Router();

// Check-in to start time tracking for a project
router.post(
    "/checkIn",
    verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
    checkIn
);

// Get elapsed time for current active session
router.get(
    "/getElapsedTime",
    verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
    getElapsedTime
);

// Pause or resume current active timer
router.put(
    "/pauseOrResume",
    verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
    pauseOrResume
);

// Check-out to end time tracking session
router.put(
    "/checkOut",
    verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
    checkOut
);

// Get user's time entries for a specific project and date
router.get(
    "/getUserTimeProject",
    verifyUser([ROLES.USER, ROLES.COMPANY, ROLES.QCADMIN]),
    getUserTimeProject
);

// Get all users' time entries for a specific project (company view)
router.get(
    "/getUsersTimeProject",
    verifyUser([ROLES.COMPANY, ROLES.QCADMIN]),
    getUsersTimeProject
);

// Get company dashboard with time tracking statistics
router.get(
    "/companyDashboard",
    verifyUser([ROLES.COMPANY, ROLES.QCADMIN]),
    getCompanyDashboard
);

export default router;
