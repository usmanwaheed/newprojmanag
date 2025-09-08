import { Router } from 'express';
import { verifyUser } from '../middleware/authMiddleware.js';
import { ROLES } from '../config/roles.js';
import { listProjectMembers, assignProjectRole, removeProjectMember } from '../controllers/projectRoleController.js';

const router = Router();

// list members - accessible to company users and project members
router.get('/:projectId', verifyUser([ROLES.COMPANY, ROLES.QCADMIN, ROLES.USER]), listProjectMembers);

// assign/update role - company only
router.post('/:projectId', verifyUser([ROLES.COMPANY]), assignProjectRole);

// remove member - company only
router.delete('/:projectId/:userId', verifyUser([ROLES.COMPANY]), removeProjectMember);

export default router;
