/* eslint-disable no-unused-vars */
import { ROLES } from "../config/roles.js";
import { apiResponse } from "../utils/apiResponse";
import ProjectRole from "../models/projectRole.js";

const rolesAuthorization = (requiredRole) => {
    return async (req, res, next) => {
        // Superadmin always allowed
        if (req.user && req.user.role === ROLES.SUPERADMIN) {
            return next();
        }

        // If requiredRole is a project-level role, check ProjectRole collection
        if (requiredRole === ROLES.QCADMIN) {
            try {
                const projectId = req.params.projectId || req.body.projectId || req.query.projectId || (req.project && req.project._id);
                if (!projectId) {
                    // no project context — fall back to global role
                    if (req.user && req.user.role === requiredRole) return next();
                    return res.status(403).json({ success: false, message: 'Forbidden: project context missing' });
                }
                const pr = await ProjectRole.findOne({ projectId, userId: req.user._id, role: requiredRole, isActive: true });
                if (pr) {
                    return next();
                } else {
                    return res.status(403).json({ success: false, message: 'Forbidden' });
                }
            } catch (err) {
                console.error('rolesAuthorization error:', err);
                return res.status(500).json({ success: false, message: 'Authorization failed' });
            }
        }

        // Default: check global role
        if (req.user && req.user.role === requiredRole) {
            return next();
        }

        res.status(403).json({ success: false, message: 'Forbidden' });
    };
};

export { rolesAuthorization };
