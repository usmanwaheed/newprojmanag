import express from "express";
import { body } from "express-validator";
import {
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanStatus,
    getPublicPlans,
    getPublicPlan,
    getAllPlans,
    getPlan,
} from "../controllers/planController.js";

const router = express.Router();

const planValidation = [
    body("name")
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage("Plan name must be between 2 and 100 characters")
        .isIn(["basic", "professional", "enterprise"])
        .withMessage("Plan name must be basic, professional, or enterprise"),

    body("price")
        .isFloat({ min: 0 })
        .withMessage("Price must be a positive number")
        .custom((value) => {
            if (value > 10000) {
                throw new Error("Price cannot exceed $10,000");
            }
            return true;
        }),

    body("billingCycle")
        .isIn(["monthly", "yearly", "weekly"])
        .withMessage("Billing cycle must be monthly, yearly, or weekly"),

    body("trialDays")
        .optional()
        .isInt({ min: 0, max: 365 })
        .withMessage("Trial days must be between 0 and 365"),

    body("isPopular")
        .optional()
        .isBoolean()
        .withMessage("isPopular must be true or false"),

    body("features")
        .isArray({ min: 1 })
        .withMessage("At least one feature is required"),

    body("features.*")
        .isString()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage("Each feature must be between 1 and 200 characters"),

    body("description")
        .trim()
        .isLength({ min: 10, max: 500 })
        .withMessage("Description must be between 10 and 500 characters"),

    body("limits.maxUsers")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Max users must be a positive integer"),

    body("limits.maxStorage")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Max storage must be a positive integer"),

    body("limits.maxApiCalls")
        .optional()
        .isInt({ min: 1 })
        .withMessage("Max API calls must be a positive integer"),
];

// Public Routes
router.get("/publicPlans", getPublicPlans);
router.get("/publicPlans/:id", getPublicPlan);

// Admin Routes with validation
router.route("/manage").get(getAllPlans).post(planValidation, createPlan);
router
    .route("/singlePlan/:id")
    .get(getPlan)
    .put(planValidation, updatePlan)
    .delete(deletePlan);

router.patch("/planStatus/:id/toggle-status", togglePlanStatus);

export default router;
