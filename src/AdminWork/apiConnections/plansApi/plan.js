import { axiosInstance } from "../../../api/axiosInstance";

// ----------------- PUBLIC -----------------
export const fetchPublicPlans = async () => {
    const response = await axiosInstance.get('/superadmin/plans/publicPlans');
    return response.data.data;
};

export const fetchSinglePublicPlan = async (id) => {
    const response = await axiosInstance.get(`/superadmin/plans/publicPlans/${id}`);
    console.log("fetchSinglePublicPlan", response.data)
    return response.data.data;
};

// ----------------- ADMIN ------------------
export const fetchAllPlans = async () => {
    const response = await axiosInstance.get('/superadmin/plans/manage');
    console.log("fetchAllPlans", response.data)
    return response.data.data;
};

export const fetchSingleAdminPlan = async (id) => {
    const response = await axiosInstance.get(`/superadmin/plans/singlePlan/${id}`);
    console.log("fetchSingleAdminPlan", response.data)
    return response.data.data;
};

export const createPlan = async (planData) => {
    const response = await axiosInstance.post('/superadmin/plans/manage', planData);
    console.log("createPlan", response.data)
    return response.data.data;
};

export const updatePlan = async ({ id, updatedData }) => {
    const response = await axiosInstance.put(`/superadmin/plans/singlePlan/${id}`, updatedData);
    console.log("updatePlan", response.data)
    return response.data.data;
};

export const deletePlan = async (id) => {
    const response = await axiosInstance.delete(`/superadmin/plans/singlePlan/${id}`);
    console.log("deletePlan", response.data)
    return response.data;
};

export const togglePlanStatus = async (id) => {
    const response = await axiosInstance.patch(`/superadmin/plans/planStatus/${id}/toggle-status`);
    console.log("togglePlanStatus", response.data)
    return response.data;
};
