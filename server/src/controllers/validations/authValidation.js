import { body, validationResult } from "express-validator";
import { ROLES } from "../../config/roles.js";

export const validateRegisterFields = (requiredFields) => {
    const validations = [
        body("name")
            .notEmpty()
            .withMessage("Name is required")
            .isLength({ min: 2, max: 50 })
            .withMessage("Name must be between 2 and 50 characters"),

        body("email")
            .isEmail()
            .withMessage("Please provide a valid email address")
            .normalizeEmail(),

        body("password")
            .isLength({ min: 6 })
            .withMessage("Password must be at least 6 characters long"),

        body("confirmPassword").custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error("Passwords do not match");
            }
            return true;
        }),

        body("role")
            .isIn(Object.values(ROLES))
            .withMessage("Invalid role selected"),

        // Conditional validation based on role
        body("companyName")
            .if(body("role").equals(ROLES.COMPANY))
            .notEmpty()
            .withMessage("Company name is required for company registration")
            .isLength({ min: 2, max: 100 })
            .withMessage("Company name must be between 2 and 100 characters"),

        body("companySpecialKey")
            .if(body("role").equals(ROLES.COMPANY))
            .optional()
            .isLength({ min: 6, max: 20 })
            .withMessage(
                "Company special key must be between 6 and 20 characters"
            )
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage(
                "Company special key can only contain letters, numbers, hyphens and underscores"
            ),

        body("userCompanyKey")
            .if(body("role").equals(ROLES.USER))
            .notEmpty()
            .withMessage(
                "Company special key is required for user registration"
            )
            .isLength({ min: 6, max: 20 })
            .withMessage(
                "Company special key must be between 6 and 20 characters"
            ),
    ];

    return [
        ...validations,
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: "Validation failed",
                    details: errors.array(),
                });
            }
            next();
        },
    ];
};

export const validateLoginFields = () => {
    const validations = [
        body("email")
            .optional()
            .isEmail()
            .withMessage("Please provide a valid email address")
            .normalizeEmail(),

        body("name")
            .optional()
            .isLength({ min: 2, max: 50 })
            .withMessage("Name must be between 2 and 50 characters"),

        body("password").notEmpty().withMessage("Password is required"),

        body("role")
            .isIn(Object.values(ROLES))
            .withMessage("Invalid role selected"),

        // Ensure either email or name is provided
        body().custom((value, { req }) => {
            if (!req.body.email && !req.body.name) {
                throw new Error("Either email or name is required");
            }
            return true;
        }),
    ];

    return [
        ...validations,
        (req, res, next) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({
                    error: "Validation failed",
                    details: errors.array(),
                });
            }
            next();
        },
    ];
};
