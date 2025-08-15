/* eslint-disable react-hooks/rules-of-hooks */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "../../../../api/axiosInstance";
// Start Recording Session
const startRecordingSession = async (data) => {
    const response = await axiosInstance.post(`/company/start-session`, data);
    return response.data;
}

export const useStartRecordingSession = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: startRecordingSession,
        onSuccess: (data) => {
            queryClient.invalidateQueries(['recordingSessions']);
        }
    })
}

// Update Recording Status
const updateRecordingStatus = async ({ sessionId, status }) => {
    const response = await axiosInstance.put(`/company/update-status/${sessionId}`, { status });
    return response.data;
}

export const useUpdateRecordingStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRecordingStatus,
        onSuccess: () => {
            queryClient.invalidateQueries(['recordingSessions']);
        }
    })
}

// Upload Recording
const uploadRecording = async ({ sessionId, formData }) => {
    const response = await axiosInstance.post(`/company/upload/${sessionId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
}

export const useUploadRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadRecording,
        onSuccess: () => {
            queryClient.invalidateQueries(['userRecordings']);
            queryClient.invalidateQueries(['companyRecordings']);
        }
    })
}

// Get User Recordings with enhanced filtering
const getUserRecordings = async (params = {}) => {
    const response = await axiosInstance.get(`/company/my-recordings`, { params });
    return response.data;
}

export const useGetUserRecordings = (params) => {
    return useQuery({
        queryKey: ['userRecordings', params],
        queryFn: () => getUserRecordings(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
}

// Get Company Recordings with enhanced filtering
const getCompanyRecordings = async (params = {}) => {
    const response = await axiosInstance.get(`/company/company-recordings`, { params });
    return response.data;
}

export const useGetCompanyRecordings = (params) => {
    return useQuery({
        queryKey: ['companyRecordings', params],
        queryFn: () => getCompanyRecordings(params),
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
}

// Get Pending Approvals
const getPendingApprovals = async () => {
    const response = await axiosInstance.get(`/company/pending-approvals`);
    return response.data;
}

export const useGetPendingApprovals = () => {
    return useQuery({
        queryKey: ['pendingApprovals'],
        queryFn: getPendingApprovals,
        staleTime: 2 * 60 * 1000, // 2 minutes - more frequent updates for pending items
        cacheTime: 5 * 60 * 1000, // 5 minutes
    })
}

// Get Recording By ID
const getRecordingById = async (id) => {
    const response = await axiosInstance.get(`/company/recording/${id}`);
    console.log("response getRecordingById", response)
    return response.data;
}

export const useGetRecordingById = (id) => {
    return useQuery({
        queryKey: ['recording', id],
        queryFn: () => getRecordingById(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
}

// Approve Recording
const approveRecording = async (id) => {
    const response = await axiosInstance.put(`/company/approve/${id}`);
    return response.data;
}

export const useApproveRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: approveRecording,
        onSuccess: () => {
            // Invalidate all recording-related queries to refresh the data
            queryClient.invalidateQueries(['pendingApprovals']);
            queryClient.invalidateQueries(['companyRecordings']);
            queryClient.invalidateQueries(['userRecordings']);
            queryClient.invalidateQueries(['recording']);
        }
    })
}

// Reject Recording
const rejectRecording = async ({ id, reason }) => {
    const response = await axiosInstance.put(`/company/reject/${id}`, { reason });
    return response.data;
}

export const useRejectRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: rejectRecording,
        onSuccess: () => {
            // Invalidate all recording-related queries to refresh the data
            queryClient.invalidateQueries(['pendingApprovals']);
            queryClient.invalidateQueries(['companyRecordings']);
            queryClient.invalidateQueries(['userRecordings']);
            queryClient.invalidateQueries(['recording']);
        }
    })
}

// Update Recording
const updateRecording = async ({ id, data }) => {
    const response = await axiosInstance.put(`/company/update/${id}`, data);
    return response.data;
}

export const useUpdateRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateRecording,
        onSuccess: () => {
            queryClient.invalidateQueries(['recording']);
            queryClient.invalidateQueries(['userRecordings']);
            queryClient.invalidateQueries(['companyRecordings']);
        }
    })
}

// Delete Recording
const deleteRecording = async (id) => {
    const response = await axiosInstance.delete(`/company/delete/${id}`);
    return response.data;
}

export const useDeleteRecording = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteRecording,
        onSuccess: () => {
            queryClient.invalidateQueries(['userRecordings']);
            queryClient.invalidateQueries(['companyRecordings']);
            queryClient.invalidateQueries(['pendingApprovals']);
        }
    })
}

// Add Comment
const addComment = async ({ id, comment }) => {
    const response = await axiosInstance.post(`/company/comment/${id}`, { comment });
    return response.data;
}

export const useAddComment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addComment,
        onSuccess: () => {
            queryClient.invalidateQueries(['recording']);
        }
    })
}

// Get Recording Analytics
const getRecordingAnalytics = async (timeRange = '30') => {
    const response = await axiosInstance.get(`/company/analytics`, {
        params: { timeRange }
    });
    return response.data;
}

export const useGetRecordingAnalytics = (timeRange) => {
    return useQuery({
        queryKey: ['recordingAnalytics', timeRange],
        queryFn: () => getRecordingAnalytics(timeRange),
        staleTime: 15 * 60 * 1000, // 15 minutes - analytics don't need frequent updates
        cacheTime: 30 * 60 * 1000, // 30 minutes
    })
}

// Get recordings by specific approval status - utility function
const getRecordingsByStatus = async (status, params = {}) => {
    const response = await axiosInstance.get(`/company/status/${status}`, { params });
    return response.data;
}

export const useGetRecordingsByStatus = (status, params) => {
    return useQuery({
        queryKey: ['recordingsByStatus', status, params],
        queryFn: () => getRecordingsByStatus(status, params),
        enabled: !!status,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
    })
}

// Search recordings - utility function
const searchRecordings = async (searchTerm, params = {}) => {
    const response = await axiosInstance.get(`/company/search`, {
        params: { ...params, q: searchTerm }
    });
    return response.data;
}

export const useSearchRecordings = (searchTerm, params) => {
    return useQuery({
        queryKey: ['searchRecordings', searchTerm, params],
        queryFn: () => searchRecordings(searchTerm, params),
        enabled: !!searchTerm && searchTerm.length > 2, // Only search if term is longer than 2 characters
        staleTime: 2 * 60 * 1000, // 2 minutes
        cacheTime: 5 * 60 * 1000, // 5 minutes
    })
}