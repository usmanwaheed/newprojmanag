import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "./axiosInstance";

// ================= NOTIFICATION API FUNCTIONS =================

// Get user notifications with pagination and filters
export const getUserNotifications = async ({
    page = 1,
    limit = 20,
    unreadOnly = false,
    type = null,
    sortBy = "createdAt",
    sortOrder = "desc"
}) => {
    const params = {
        page,
        limit,
        unreadOnly,
        sortBy,
        sortOrder
    };

    if (type) params.type = type;

    const { data } = await axiosInstance.get('/notifications', { params });
    return data;
};

// Get unread notifications count
export const getUnreadCount = async () => {
    const { data } = await axiosInstance.get('/notifications/unread-count');
    return data;
};

// Get single notification by ID
export const getNotificationById = async (id) => {
    const { data } = await axiosInstance.get(`/notifications/${id}`);
    return data;
};

// Mark specific notifications as read
export const markNotificationsAsRead = async (notificationIds) => {
    const { data } = await axiosInstance.put('/notifications/mark-read', {
        notificationIds
    });
    return data;
};

// Mark all notifications as read
export const markAllNotificationsAsRead = async () => {
    const { data } = await axiosInstance.put('/notifications/mark-all-read');
    return data;
};

// Delete single notification
export const deleteNotification = async (id) => {
    const { data } = await axiosInstance.delete(`/notifications/${id}`);
    return data;
};

// Delete multiple notifications
export const deleteNotifications = async (notificationIds) => {
    const { data } = await axiosInstance.delete('/notifications/delete', {
        data: { notificationIds }
    });
    return data;
};

// Get notification statistics (Company only)
export const getNotificationStats = async () => {
    const { data } = await axiosInstance.get('/notifications/stats');
    return data;
};

// Create manual notification (Company only)
export const createManualNotification = async ({
    recipients,
    type,
    title,
    message,
    priority = "medium",
    channels = { inApp: true },
    actionButton = null
}) => {
    const { data } = await axiosInstance.post('/notifications/create-manual', {
        recipients,
        type,
        title,
        message,
        priority,
        channels,
        actionButton
    });
    return data;
};

// Cleanup old notifications (Company only)
export const cleanupOldNotifications = async () => {
    const { data } = await axiosInstance.delete('/notifications/cleanup');
    return data;
};

// ================= CUSTOM HOOKS =================

// Hook to fetch user notifications
export const useNotifications = (filters = {}) => {
    return useQuery({
        queryKey: ['notifications', filters],
        queryFn: () => getUserNotifications(filters),
        staleTime: 30000, // 30 seconds
        refetchInterval: 60000, // Refetch every minute
    });
};

// Hook to get unread count
export const useUnreadCount = () => {
    return useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: getUnreadCount,
        refetchInterval: 30000, // Refetch every 30 seconds
    });
};

// Hook to get single notification
export const useNotification = (id) => {
    return useQuery({
        queryKey: ['notification', id],
        queryFn: () => getNotificationById(id),
        enabled: !!id,
    });
};

// Hook to mark notifications as read
export const useMarkNotificationsAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications', 'unread-count']);
        },
        onError: (error) => {
            console.error('Error marking notifications as read:', error);
        },
    });
};

// Hook to mark all notifications as read
export const useMarkAllNotificationsAsRead = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: markAllNotificationsAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications', 'unread-count']);
        },
        onError: (error) => {
            console.error('Error marking all notifications as read:', error);
        },
    });
};

// Hook to delete notification
export const useDeleteNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteNotification,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries(['notifications']);

            const previousNotifications = queryClient.getQueryData(['notifications']);

            // Optimistically remove the notification
            queryClient.setQueryData(['notifications'], (oldData) => {
                if (!oldData?.data?.notifications) return oldData;

                return {
                    ...oldData,
                    data: {
                        ...oldData.data,
                        notifications: oldData.data.notifications.filter(
                            (notification) => notification._id !== notificationId
                        ),
                        pagination: {
                            ...oldData.data.pagination,
                            totalNotifications: oldData.data.pagination.totalNotifications - 1
                        }
                    }
                };
            });

            return { previousNotifications };
        },
        onError: (error, notificationId, context) => {
            if (context?.previousNotifications) {
                queryClient.setQueryData(['notifications'], context.previousNotifications);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications', 'unread-count']);
        },
    });
};

// Hook to delete multiple notifications
export const useDeleteNotifications = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: deleteNotifications,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications', 'unread-count']);
        },
        onError: (error) => {
            console.error('Error deleting notifications:', error);
        },
    });
};

// Hook to get notification stats (Company only)
export const useNotificationStats = () => {
    return useQuery({
        queryKey: ['notifications', 'stats'],
        queryFn: getNotificationStats,
        staleTime: 300000, // 5 minutes
    });
};

// Hook to create manual notification (Company only)
export const useCreateManualNotification = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: createManualNotification,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        },
        onError: (error) => {
            console.error('Error creating manual notification:', error);
        },
    });
};

// Hook to cleanup old notifications (Company only)
export const useCleanupOldNotifications = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: cleanupOldNotifications,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
            queryClient.invalidateQueries(['notifications', 'stats']);
        },
        onError: (error) => {
            console.error('Error cleaning up notifications:', error);
        },
    });
};