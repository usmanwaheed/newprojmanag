import {
    useQuery,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query';

import {
    syncSubscriptionWithStripe, createSubscription, fetchCurrentSubscription,
    fetchSubscriptionHistory, cancelSubscription,
    changeSubscriptionPlan, fetchAllSubscriptions,
    fetchSubscriptionAnalytics, toggleSubscriptionStatus,
    confirmSubscriptionPayment, updatePaymentMethod,
    fetchSubscriptionInvoice, fetchUpcomingInvoice,
    checkExpiringTrials, updateSubscriptionStatus,
} from '../apiConnections/subscriptionApi/subscription';

// ------------------ USER/COMPANY HOOKS ------------------

// Create subscription hook
export const useCreateSubscription = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createSubscription,
        onSuccess: (data) => {
            console.log('  Subscription created successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });
        },
        onError: (error) => {
            console.error('  Create subscription failed:', error?.response?.data || error.message);
        },
    });
};

// Confirm payment hook
export const useConfirmSubscriptionPayment = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: confirmSubscriptionPayment,
        onSuccess: (data) => {
            console.log('  Payment confirmed successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });
        },
        onError: (error) => {
            console.error('  Confirm payment failed:', error?.response?.data || error.message);
        },
    });
};

// Get current subscription hook
export const useCurrentSubscription = (options = {}) => {
    return useQuery({
        queryKey: ['currentSubscription'],
        queryFn: fetchCurrentSubscription,
        staleTime: 5 * 60 * 1000, // 5 minutes
        cacheTime: 10 * 60 * 1000, // 10 minutes
        retry: 1,
        ...options,
    });
};

// Get subscription history hook
export const useSubscriptionHistory = (params = {}) => {
    return useQuery({
        queryKey: ['subscriptionHistory', params],
        queryFn: () => fetchSubscriptionHistory(params),
        staleTime: 5 * 60 * 1000,
        ...params.options,
    });
};

// Cancel subscription hook
export const useCancelSubscription = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ subscriptionId, reason }) => cancelSubscription(subscriptionId, reason),
        onSuccess: (data) => {
            console.log('  Subscription cancelled successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });
        },
        onError: (error) => {
            console.error('  Cancel subscription failed:', error?.response?.data || error.message);
        },
    });
};

// Change subscription plan hook
export const useChangeSubscriptionPlan = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: changeSubscriptionPlan,
        onSuccess: (data) => {
            console.log('  Plan changed successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptionHistory'] });
        },
        onError: (error) => {
            console.error('  Change plan failed:', error?.response?.data || error.message);
        },
    });
};

// ------------------ ADMIN HOOKS ------------------

// Get all subscriptions hook
export const useAllSubscriptions = (params = {}) => {
    return useQuery({
        queryKey: ['allSubscriptions', params],
        queryFn: () => fetchAllSubscriptions(params),
        staleTime: 2 * 60 * 1000, // 2 minutes for admin data
        ...params.options,
    });
};

// Get subscription analytics hook
export const useSubscriptionAnalytics = (options = {}) => {
    return useQuery({
        queryKey: ['subscriptionAnalytics'],
        queryFn: fetchSubscriptionAnalytics,
        staleTime: 5 * 60 * 1000,
        ...options,
    });
};

// Toggle subscription status hook
export const useToggleSubscriptionStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: toggleSubscriptionStatus,
        onSuccess: (data) => {
            console.log('  Subscription status toggled successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptionAnalytics'] });
        },
        onError: (error) => {
            console.error('  Toggle subscription status failed:', error?.response?.data || error.message);
        },
    });
};

// Check expiring trials hook
export const useCheckExpiringTrials = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: checkExpiringTrials,
        onSuccess: (data) => {
            console.log('  Expiring trials checked successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['subscriptionAnalytics'] });
        },
        onError: (error) => {
            console.error('  Check expiring trials failed:', error?.response?.data || error.message);
        },
    });
};

// ------------------ ADDITIONAL HOOKS ------------------

// Update payment method hook
export const useUpdatePaymentMethod = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updatePaymentMethod,
        onSuccess: (data) => {
            console.log('  Payment method updated successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
        },
        onError: (error) => {
            console.error('  Update payment method failed:', error?.response?.data || error.message);
        },
    });
};

// Get subscription invoice hook
export const useSubscriptionInvoice = (invoiceId, options = {}) => {
    return useQuery({
        queryKey: ['subscriptionInvoice', invoiceId],
        queryFn: () => fetchSubscriptionInvoice(invoiceId),
        enabled: !!invoiceId,
        ...options,
    });
};

// Get upcoming invoice hook
export const useUpcomingInvoice = (subscriptionId, options = {}) => {
    return useQuery({
        queryKey: ['upcomingInvoice', subscriptionId],
        queryFn: () => fetchUpcomingInvoice(subscriptionId),
        enabled: !!subscriptionId,
        ...options,
    });
};

// Update subscription status hook (Dev mode)
export const useUpdateSubscriptionStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ subscriptionId, status, reason }) =>
            updateSubscriptionStatus(subscriptionId, status, reason),
        onSuccess: (data) => {
            console.log('  Subscription status updated successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
        },
        onError: (error) => {
            console.error('  Update subscription status failed:', error?.response?.data || error.message);
        },
    });
};

// Sync subscription with Stripe hook (Dev mode)
export const useSyncSubscriptionWithStripe = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: syncSubscriptionWithStripe,
        onSuccess: (data) => {
            console.log('  Subscription synced with Stripe successfully:', data);
            queryClient.invalidateQueries({ queryKey: ['currentSubscription'] });
            queryClient.invalidateQueries({ queryKey: ['allSubscriptions'] });
        },
        onError: (error) => {
            console.error('  Sync subscription failed:', error?.response?.data || error.message);
        },
    });
};

// ------------------ CUSTOM UTILITY HOOKS ------------------

// Custom hook for subscription status checks
export const useSubscriptionStatus = () => {
    const { data: subscription, isLoading, error } = useCurrentSubscription();

    const subscriptionData = subscription?.data || subscription;

    return {
        subscription: subscriptionData,
        isLoading,
        error,
        hasActiveSubscription: subscriptionData?.status === 'active',
        isOnTrial: subscriptionData?.status === 'trial',
        isPastDue: subscriptionData?.status === 'past_due',
        isCanceled: subscriptionData?.status === 'canceled',
        isUnpaid: subscriptionData?.status === 'unpaid',
        trialDaysRemaining: subscriptionData?.trialDaysRemaining || 0,
        daysUntilRenewal: subscriptionData?.daysRemaining || 0,
        canAccessFeatures: ['active', 'trial'].includes(subscriptionData?.status),
        planName: subscriptionData?.planId?.name || 'No Plan',
        billingCycle: subscriptionData?.planId?.billingCycle || 'monthly',
        amount: subscriptionData?.amount || 0,
        trialEndDate: subscriptionData?.trialEndDate,
        endDate: subscriptionData?.endDate,
    };
};

// Custom hook for plan limits checking
export const usePlanLimits = () => {
    const { data: subscription } = useCurrentSubscription();
    const subscriptionData = subscription?.data || subscription;

    const checkLimit = (feature, currentUsage) => {
        if (!subscriptionData?.limits) return { allowed: true, percentage: 0, unlimited: true };

        const limit = subscriptionData.limits[feature];
        if (!limit || limit === -1) return { allowed: true, percentage: 0, unlimited: true };

        const percentage = (currentUsage / limit) * 100;
        return {
            allowed: currentUsage < limit,
            percentage: Math.min(percentage, 100),
            current: currentUsage,
            limit,
            remaining: Math.max(limit - currentUsage, 0),
            unlimited: false,
        };
    };

    return {
        subscription: subscriptionData,
        checkLimit,
        checkUserLimit: (currentUsers) => checkLimit('maxUsers', currentUsers),
        checkStorageLimit: (currentStorage) => checkLimit('maxStorage', currentStorage),
        checkApiLimit: (currentApiCalls) => checkLimit('maxApiCalls', currentApiCalls),
        checkProjectLimit: (currentProjects) => checkLimit('maxProjects', currentProjects),
    };
};

// Custom hook for admin dashboard data
export const useAdminSubscriptionDashboard = () => {
    const { data: analytics, isLoading: analyticsLoading } = useSubscriptionAnalytics();
    const { data: subscriptions, isLoading: subscriptionsLoading } = useAllSubscriptions({
        limit: 10,
        status: 'active'
    });

    const analyticsData = analytics?.data || analytics;
    const subscriptionsData = subscriptions?.data || [];

    return {
        analytics: analyticsData,
        recentSubscriptions: subscriptionsData,
        isLoading: analyticsLoading || subscriptionsLoading,
        totalRevenue: analyticsData?.monthlyRevenue || 0,
        activeSubscriptions: analyticsData?.activeSubscriptions || 0,
        trialSubscriptions: analyticsData?.trialSubscriptions || 0,
        canceledSubscriptions: analyticsData?.canceledSubscriptions || 0,
        totalSubscriptions: analyticsData?.totalSubscriptions || 0,
        planDistribution: analyticsData?.planDistribution || [],
        companyPlanStats: analyticsData?.companyPlanStats || [],
    };
};

// Custom hook for subscription notifications
export const useSubscriptionNotifications = () => {
    const { subscription, isOnTrial, trialDaysRemaining, isPastDue } = useSubscriptionStatus();

    const getNotifications = () => {
        const notifications = [];

        if (isOnTrial && trialDaysRemaining <= 3 && trialDaysRemaining > 0) {
            notifications.push({
                type: 'warning',
                title: 'Trial Ending Soon',
                message: `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining > 1 ? 's' : ''}. Upgrade now to continue using all features.`,
                action: 'upgrade',
                priority: 'high'
            });
        }

        if (isPastDue) {
            notifications.push({
                type: 'error',
                title: 'Payment Required',
                message: 'Your subscription payment is overdue. Update your payment method to restore access.',
                action: 'updatePayment',
                priority: 'critical'
            });
        }

        return notifications;
    };

    return {
        notifications: getNotifications(),
        hasNotifications: getNotifications().length > 0,
        criticalNotifications: getNotifications().filter(n => n.priority === 'critical'),
        warningNotifications: getNotifications().filter(n => n.priority === 'high'),
    };
};