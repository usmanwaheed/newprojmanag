import { axiosInstance } from './axiosInstance';

export const getProjectMembers = async (projectId) => {
  const res = await axiosInstance.get(`/user/project-roles/${projectId}`);
  return res.data;
};

export const assignProjectRole = async ({ projectId, userId, role }) => {
  const res = await axiosInstance.post(`/user/project-roles/${projectId}`, { userId, role });
  return res.data;
};

export const removeProjectMember = async ({ projectId, userId }) => {
  const res = await axiosInstance.delete(`/user/project-roles/${projectId}/${userId}`);
  return res.data;
};
