import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { apiResponse } from '../utils/apiResponse.js';
import { apiError } from '../utils/apiError.js';
import ProjectRole from '../models/projectRole.js';
import { adminTask } from '../models/adminTask.js';
import { User } from '../models/userModel.js';
import { ROLES } from '../config/roles.js';

// helper to get companyId from user
const getUserCompanyId = (user) => {
  if (user.role === ROLES.COMPANY) return user._id;
  if ((user.role === ROLES.USER || user.role === ROLES.QCADMIN) && user.companyId) return user.companyId;
  return null;
};

// Ensure project belongs to company
const validateProjectCompany = async (projectId, companyId) => {
  const project = await adminTask.findOne({ _id: projectId, companyId });
  if (!project) throw new apiError(403, 'Project not found or access denied');
  return project;
};

// List members for a project
const listProjectMembers = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const companyId = getUserCompanyId(req.user);
  if (!mongoose.isValidObjectId(projectId)) throw new apiError(400, 'Invalid projectId');
  if (!companyId) throw new apiError(400, 'Company context required');
  await validateProjectCompany(projectId, companyId);
  const roles = await ProjectRole.find({ projectId, isActive: true }).populate('userId', 'name avatar role');
  return res.status(200).json(new apiResponse(200, roles, 'Project members fetched'));
});

// Assign or update role for a member in a project
const assignProjectRole = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { userId, role } = req.body;
  const companyId = getUserCompanyId(req.user);
  if (!projectId || !userId || !role) throw new apiError(400, 'projectId, userId and role are required');
  if (!Object.values(ROLES).includes(role)) throw new apiError(400, 'Invalid role');
  await validateProjectCompany(projectId, companyId);
  const user = await User.findOne({ _id: userId, $or: [{ _id: companyId }, { companyId }] });
  if (!user) throw new apiError(404, 'User not found in your company');
  const pr = await ProjectRole.findOneAndUpdate(
    { projectId, userId },
    { role, isActive: true },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return res.status(200).json(new apiResponse(200, pr, 'Role assigned'));
});

// Remove member from project
const removeProjectMember = asyncHandler(async (req, res) => {
  const { projectId, userId } = req.params;
  const companyId = getUserCompanyId(req.user);
  await validateProjectCompany(projectId, companyId);
  await ProjectRole.findOneAndUpdate({ projectId, userId }, { isActive: false });
  return res.status(200).json(new apiResponse(200, null, 'Member removed'));
});

export { listProjectMembers, assignProjectRole, removeProjectMember };
