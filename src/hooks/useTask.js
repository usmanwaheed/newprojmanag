import { toast } from "react-toastify";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
    createTask, deleteTask,
    fetchTask, projectApproval,
    submitTask, updateTask,
    fetchTaskById, fetchMyAssignedTasks
} from "../api/taskApi";

export const useCreateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createTask,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['tasks']);
            toast.success(data.message || "Task created successfully");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to create task");
        }
    });
}

export const useGetCreateTask = (companyId) => {
    return useQuery({
        queryKey: ['tasks', companyId],
        queryFn: () => fetchTask(companyId),
        enabled: !!companyId,
    });
}

export const useGetTaskById = (id) => {
    return useQuery({
        queryKey: ['task', id],
        queryFn: () => fetchTaskById(id),
        enabled: !!id,
    });
}

export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteTask,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['tasks']);
            toast.success(data.message || "Task deleted successfully");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to delete task");
        }
    });
}

export const useUpdateTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, updateData }) => updateTask(taskId, updateData),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['tasks']);
            toast.success(data.message || "Task updated successfully");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to update task");
        }
    });
}

export const useSubmitTask = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, status }) => submitTask(taskId, status),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['tasks']);
            toast.success(data.message || "Task status updated");
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to update task status");
        }
    });
}

export const useProjectApproval = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ taskId, projectStatus }) => projectApproval(taskId, projectStatus),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['tasks']);
            toast.success(`Task ${data.data.projectStatus} successfully`);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || "Failed to update approval status");
        }
    });
}

export const useGetMyAssignedTasks = (companyId, userName) => {
    return useQuery({
        queryKey: ['myTasks', companyId, userName],
        queryFn: () => fetchMyAssignedTasks(companyId, userName),
        enabled: !!companyId && !!userName,
    });
}


