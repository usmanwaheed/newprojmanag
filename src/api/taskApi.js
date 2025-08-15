import { axiosInstance } from "./axiosInstance"


export const createTask = async (taskId) => {
        const response = await axiosInstance.post('/user/create-task', taskId);
        return response.data
}



export const fetchTask = async (taskId) => {
        const response = await axiosInstance.get('/user/get-create-task', taskId);
        return response.data || [];
}
export const fetchMyAssignedTasks = async (taskId) => {
        const response = await axiosInstance.get('/user/my-assigned-tasks', taskId);
        return response.data || [];
}



export const deleteTask = async (taskId) => {
        const response = await axiosInstance.delete(`/user/get-delete-task/${taskId}`);
        return response.data;
}



export const updateTask = async (taskId, updateData) => {
        const response = await axiosInstance.put(`/user/get-update-task/${taskId}`, updateData);
        return response.data;
}



export const fetchTaskById = async (id) => {
        const response = await axiosInstance.get(`/user/get-create-task/${id}`);
        return response.data;
};



export const submitTask = async (taskId, status) => {
        const response = await axiosInstance.put(`/user/submit-task/${taskId}`, { status });
        return response.data;
}



export const projectApproval = async (taskId, projectStatus) => {
        const response = await axiosInstance.put(`/user/project-approval/${taskId}`, { projectStatus });
        return response.data;
};




// Changed here
export const createSubTask = async (taskData) => {
        const response = await axiosInstance.post('/user/create-subTask', taskData);
        return response.data;
};

export const getSubTask = async (projectId) => {
        const response = await axiosInstance.get('/user/get-subTask', {
                params: { projectId }
        });
        return response.data;
};

export const getUserForSubTask = async (projectId) => {
        const response = await axiosInstance.get(`/user/get-userOfSubTask/${projectId}`);
        return response.data;
};

export const deleteSubTask = async (taskId) => {
        const response = await axiosInstance.delete(`/user/delete-subTask/${taskId}`);
        return response.data;
};

export const updateSubTask = async (taskId, updateData) => {
        const response = await axiosInstance.put(`/user/update-subTask/${taskId}`, updateData);
        return response.data;
};

export const filterSubTask = async (searchText, filterField, projectId) => {
        const response = await axiosInstance.get('/user/search-subTask', {
                params: { searchText, filterField, projectId }
        });
        return response.data;
};

export const completeSubTask = async (taskId) => {
        const response = await axiosInstance.patch(`/user/complete-subTask/${taskId}`);
        return response.data;
};

export const getCompleteSubTask = async (companyId) => {
        const response = await axiosInstance.get('/user/get-complete-subTask', {
                params: { companyId }
        });
        return response.data;
};

export const subCompleteTaskApproval = async (taskId, status) => {
        const response = await axiosInstance.patch(`/user/approve-subTask/${taskId}`, { status });
        return response.data;
};