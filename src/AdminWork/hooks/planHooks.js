import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';
import {
    fetchPublicPlans,
    fetchSinglePublicPlan,
    fetchAllPlans,
    fetchSingleAdminPlan,
    createPlan,
    updatePlan,
    deletePlan,
    togglePlanStatus,
} from '../apiConnections/plansApi/plan';


// ------------------ PUBLIC ------------------
export const usePublicPlans = () => {
    return useQuery({
        queryKey: ['publicPlans'],
        queryFn: fetchPublicPlans,
    });
};

export const usePublicPlan = (id) => {
    return useQuery({
        queryKey: ['publicPlan', id],
        queryFn: () => fetchSinglePublicPlan(id),
        enabled: !!id,
    });
};


// ------------------ ADMIN ------------------
export const useAdminPlans = () => {
    return useQuery({
        queryKey: ['adminPlans'],
        queryFn: fetchAllPlans,
    });
};

export const useAdminPlan = (id) => {
    return useQuery({
        queryKey: ['adminPlan', id],
        queryFn: () => fetchSingleAdminPlan(id),
        enabled: !!id,
    });
};

export const useCreatePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createPlan,
        onSuccess: () => {
            queryClient.invalidateQueries(['adminPlans']);
        },
        onError: (err) => {
            console.error('Create plan failed:', err?.response?.data || err.message);
        },
    });
};

export const useUpdatePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePlan,
        onSuccess: (data, variables) => {
            queryClient.invalidateQueries(['adminPlans']);
            queryClient.invalidateQueries(['adminPlan', variables.id]);
        },
        onError: (err) => {
            console.error('Update plan failed:', err?.response?.data || err.message);
        },
    });
};

export const useDeletePlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deletePlan,
        onSuccess: () => {
            queryClient.invalidateQueries(['adminPlans']);
        },
        onError: (err) => {
            console.error('Delete plan failed:', err?.response?.data || err.message);
        },
    });
};

export const useTogglePlanStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: togglePlanStatus,
        onSuccess: () => {
            queryClient.invalidateQueries(['adminPlans']);
        },
        onError: (err) => {
            console.error('Toggle plan status failed:', err?.response?.data || err.message);
        },
    });
};
