import { axiosInstance } from "./axiosInstance";
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

// API Functions
export const userCheckIn = async (projectId) => {
    const { data } = await axiosInstance.post('/user/checkIn', { projectId });
    return data;
}

export const userGetElapsedTime = async (projectId) => {
    try {
        const { data } = await axiosInstance.get(`/user/getElapsedTime?projectId=${projectId}`);
        return data;
    } catch (error) {
        console.error("Error fetching elapsed time:", error);
        throw error;
    }
}

export const userPauseOrResume = async (projectId) => {
    const response = await axiosInstance.put('/user/pauseOrResume', { projectId });
    return response;
};

export const userCheckOut = async (projectId) => {
    const { data } = await axiosInstance.put('/user/checkOut', { projectId });
    return data;
}

export const userTimeProject = async (projectId) => {
    const { data } = await axiosInstance.get(`/user/getUserTimeProject?projectId=${projectId}`);
    return data;
}

export const usersTimeProject = async (projectId) => {
    const { data } = await axiosInstance.get(`/user/getUsersTimeProject?projectId=${projectId}`);
    return data;
};

// Timer States
export const TIMER_STATES = {
    IDLE: 'idle',
    RUNNING: 'running',
    PAUSED: 'paused',
    CHECKED_OUT: 'checked_out'
};

// Global timer registry to persist state across component mounts
const timerRegistry = new Map();

// Custom hook for optimized time tracking with persistence
export const useOptimizedTimeTracker = (projectId) => {
    const queryClient = useQueryClient();
    const timerKey = `timer-${projectId}`;

    // Get or create persistent state
    const getPersistedState = useCallback(() => {
        if (!timerRegistry.has(timerKey)) {
            timerRegistry.set(timerKey, {
                timerState: TIMER_STATES.IDLE,
                elapsedTime: 0,
                lastServerSync: null,
                syncDrift: 0,
                localStartTime: null,
                serverCheckInTime: null,
                pausedDuration: 0,
                lastPauseTime: null,
                intervalId: null,
                syncIntervalId: null
            });
        }
        return timerRegistry.get(timerKey);
    }, [timerKey]);

    // Initialize state from persistent registry
    const persistedState = getPersistedState();
    const [timerState, setTimerState] = useState(persistedState.timerState);
    const [elapsedTime, setElapsedTime] = useState(persistedState.elapsedTime);
    const [lastServerSync, setLastServerSync] = useState(persistedState.lastServerSync);
    const [syncDrift, setSyncDrift] = useState(persistedState.syncDrift);

    // Refs for timer calculations
    const localStartTimeRef = useRef(persistedState.localStartTime);
    const serverCheckInTimeRef = useRef(persistedState.serverCheckInTime);
    const pausedDurationRef = useRef(persistedState.pausedDuration);
    const lastPauseTimeRef = useRef(persistedState.lastPauseTime);
    const intervalRef = useRef(persistedState.intervalId);
    const syncIntervalRef = useRef(persistedState.syncIntervalId);

    // Update persistent state whenever local state changes
    const updatePersistedState = useCallback(() => {
        const state = timerRegistry.get(timerKey);
        if (state) {
            state.timerState = timerState;
            state.elapsedTime = elapsedTime;
            state.lastServerSync = lastServerSync;
            state.syncDrift = syncDrift;
            state.localStartTime = localStartTimeRef.current;
            state.serverCheckInTime = serverCheckInTimeRef.current;
            state.pausedDuration = pausedDurationRef.current;
            state.lastPauseTime = lastPauseTimeRef.current;
            state.intervalId = intervalRef.current;
            state.syncIntervalId = syncIntervalRef.current;
        }
    }, [timerKey, timerState, elapsedTime, lastServerSync, syncDrift]);

    // Update persistent state on changes
    useEffect(() => {
        updatePersistedState();
    }, [updatePersistedState]);

    // Derived states
    const isRunning = timerState === TIMER_STATES.RUNNING;
    const isPaused = timerState === TIMER_STATES.PAUSED;
    const isCheckedOut = timerState === TIMER_STATES.CHECKED_OUT;
    const isIdle = timerState === TIMER_STATES.IDLE;

    // Server sync with smart intervals
    const { data: serverTimeData, refetch: refetchServerTime, isError } = useQuery({
        queryKey: ['elapsedTime', projectId],
        queryFn: () => userGetElapsedTime(projectId),
        enabled: !!projectId,
        staleTime: 15000, // 15 seconds - reduced for better accuracy
        cacheTime: 60000, // 1 minute
        refetchInterval: (data) => {
            // Only refetch if timer is running and we haven't checked out
            if (!data?.data?.isRunning || data?.data?.isCheckedOut) return false;
            return isRunning ? 30000 : false; // Refetch every 30 seconds when running
        },
        refetchIntervalInBackground: false,
        retry: 2,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        onSuccess: (data) => {
            syncWithServerData(data);
        },
        onError: (error) => {
            console.error('Failed to sync with server:', error);
        }
    });

    // Sync local state with server data
    const syncWithServerData = useCallback((data) => {
        if (!data?.data) return;

        const serverData = data.data;
        const now = Date.now();

        // Update timer state based on server response
        if (serverData.isCheckedOut) {
            setTimerState(TIMER_STATES.CHECKED_OUT);
            setElapsedTime(serverData.totalDuration || serverData.elapsedTime || 0);
            // Clear intervals when checked out
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        } else if (serverData.isRunning && serverData.checkIn) {
            setTimerState(TIMER_STATES.RUNNING);

            // Calculate sync drift for accuracy
            const serverElapsed = serverData.elapsedTime || 0;
            const expectedLocalTime = localStartTimeRef.current ?
                Math.floor((now - localStartTimeRef.current) / 1000) : 0;

            setSyncDrift(serverElapsed - expectedLocalTime);

            // Update local timer with server time
            if (serverData.checkInTime) {
                serverCheckInTimeRef.current = new Date(serverData.checkInTime).getTime();
                localStartTimeRef.current = now - (serverElapsed * 1000);
            }

            pausedDurationRef.current = serverData.pausedDuration || 0;
            setElapsedTime(serverElapsed);
        } else if (serverData.checkIn && !serverData.isRunning) {
            setTimerState(TIMER_STATES.PAUSED);
            setElapsedTime(serverData.elapsedTime || 0);
            lastPauseTimeRef.current = serverData.pauseTime ? new Date(serverData.pauseTime).getTime() : now;
        } else if (!serverData.checkIn) {
            setTimerState(TIMER_STATES.IDLE);
            setElapsedTime(0);
            // Reset all refs when idle
            localStartTimeRef.current = null;
            serverCheckInTimeRef.current = null;
            pausedDurationRef.current = 0;
            lastPauseTimeRef.current = null;
            setSyncDrift(0);
        }

        setLastServerSync(now);
    }, []);

    // Fixed local timer update function - removed useCallback to fix stale closure
    const updateLocalTimer = () => {
        const now = Date.now();
        if (localStartTimeRef.current) {
            const rawElapsed = Math.floor((now - localStartTimeRef.current) / 1000);
            const adjustedElapsed = Math.max(0, rawElapsed + syncDrift);
            setElapsedTime(adjustedElapsed);
        }
    };

    // Start/stop local timer - FIXED: Removed dependencies to avoid stale closure
    useEffect(() => {
        if (isRunning) {
            // Clear any existing interval
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Update immediately
            updateLocalTimer();

            // Then update every second - using a fresh function each time
            intervalRef.current = setInterval(() => {
                const now = Date.now();
                if (localStartTimeRef.current) {
                    const rawElapsed = Math.floor((now - localStartTimeRef.current) / 1000);
                    const adjustedElapsed = Math.max(0, rawElapsed + syncDrift);
                    setElapsedTime(adjustedElapsed);
                }
            }, 1000);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning, syncDrift]); // Added syncDrift as dependency

    // Periodic server sync for running timers (every 2 minutes)
    useEffect(() => {
        if (isRunning) {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
            }

            syncIntervalRef.current = setInterval(() => {
                refetchServerTime();
            }, 120000); // 2 minutes
        } else {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        }

        return () => {
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }
        };
    }, [isRunning, refetchServerTime]);

    // Initial sync when component mounts
    useEffect(() => {
        if (projectId && (!lastServerSync || Date.now() - lastServerSync > 30000)) {
            refetchServerTime();
        }
    }, [projectId, lastServerSync, refetchServerTime]);

    // Check-in mutation with optimistic updates
    const checkInMutation = useMutation({
        mutationFn: () => userCheckIn(projectId),
        onMutate: async () => {
            await queryClient.cancelQueries(['elapsedTime', projectId]);

            const previousData = queryClient.getQueryData(['elapsedTime', projectId]);

            const now = Date.now();
            setTimerState(TIMER_STATES.RUNNING);
            localStartTimeRef.current = now;
            serverCheckInTimeRef.current = now;
            pausedDurationRef.current = 0;
            setSyncDrift(0);
            setElapsedTime(0);

            return { previousData };
        },
        onSuccess: (data) => {
            toast.success("Checked in successfully!");
            setTimeout(() => refetchServerTime(), 500);
        },
        onError: (error, variables, context) => {
            toast.error(error.response?.data?.message || "Failed to check in.");

            setTimerState(TIMER_STATES.IDLE);
            setElapsedTime(0);
            localStartTimeRef.current = null;

            if (context?.previousData) {
                queryClient.setQueryData(['elapsedTime', projectId], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries(['elapsedTime', projectId]);
        }
    });

    // Pause/Resume mutation with optimistic updates
    const pauseOrResumeMutation = useMutation({
        mutationFn: () => userPauseOrResume(projectId),
        onMutate: async () => {
            await queryClient.cancelQueries(['elapsedTime', projectId]);

            const previousData = queryClient.getQueryData(['elapsedTime', projectId]);
            const now = Date.now();

            if (isRunning) {
                const currentElapsed = localStartTimeRef.current ?
                    Math.floor((now - localStartTimeRef.current) / 1000) + syncDrift : elapsedTime;

                setTimerState(TIMER_STATES.PAUSED);
                lastPauseTimeRef.current = now;
                setElapsedTime(currentElapsed);
            } else if (isPaused) {
                if (lastPauseTimeRef.current) {
                    const pauseDuration = Math.floor((now - lastPauseTimeRef.current) / 1000);
                    pausedDurationRef.current += pauseDuration;
                }

                setTimerState(TIMER_STATES.RUNNING);
                localStartTimeRef.current = now - (elapsedTime * 1000);
                lastPauseTimeRef.current = null;
            }

            return { previousData, wasRunning: isRunning };
        },
        onSuccess: (response) => {
            const message = isRunning ? "Timer paused successfully!" : "Timer resumed successfully!";
            toast.success(message);
            setTimeout(() => refetchServerTime(), 500);
        },
        onError: (error, variables, context) => {
            toast.error(error.response?.data?.message || "Failed to pause/resume timer.");

            if (context?.wasRunning) {
                setTimerState(TIMER_STATES.RUNNING);
            } else {
                setTimerState(TIMER_STATES.PAUSED);
            }

            if (context?.previousData) {
                queryClient.setQueryData(['elapsedTime', projectId], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries(['elapsedTime', projectId]);
        }
    });

    // Check-out mutation
    const checkOutMutation = useMutation({
        mutationFn: () => userCheckOut(projectId),
        onMutate: async () => {
            await queryClient.cancelQueries(['elapsedTime', projectId]);

            const previousData = queryClient.getQueryData(['elapsedTime', projectId]);

            setTimerState(TIMER_STATES.CHECKED_OUT);

            const finalTime = isRunning && localStartTimeRef.current ?
                Math.floor((Date.now() - localStartTimeRef.current) / 1000) + syncDrift : elapsedTime;

            setElapsedTime(finalTime);

            return { previousData };
        },
        onSuccess: (data) => {
            toast.success("Checked out successfully!");

            if (data?.data?.totalDuration !== undefined) {
                setElapsedTime(data.data.totalDuration);
            }

            // Clean up refs
            localStartTimeRef.current = null;
            serverCheckInTimeRef.current = null;
            pausedDurationRef.current = 0;
            lastPauseTimeRef.current = null;
            setSyncDrift(0);

            // Clear intervals
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            if (syncIntervalRef.current) {
                clearInterval(syncIntervalRef.current);
                syncIntervalRef.current = null;
            }

            queryClient.invalidateQueries(['userInfo', projectId]);
        },
        onError: (error, variables, context) => {
            toast.error(error.response?.data?.message || "Failed to check out.");

            setTimerState(isRunning ? TIMER_STATES.RUNNING : TIMER_STATES.PAUSED);

            if (context?.previousData) {
                queryClient.setQueryData(['elapsedTime', projectId], context.previousData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries(['elapsedTime', projectId]);
        }
    });

    // Format time helper with memoization
    const formatTime = useMemo(() => {
        return (seconds) => {
            if (!seconds || isNaN(seconds)) return "00:00:00";
            const hrs = Math.floor(Math.abs(seconds) / 3600);
            const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
            const secs = Math.abs(seconds) % 60;
            return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
        };
    }, []);

    // Manual server sync function
    const syncWithServer = useCallback(async () => {
        try {
            await refetchServerTime();
        } catch (error) {
            console.error('Manual sync failed:', error);
        }
    }, [refetchServerTime]);

    // Connection status
    const connectionStatus = useMemo(() => {
        if (isError) return 'error';
        if (!lastServerSync) return 'connecting';
        if (Date.now() - lastServerSync > 120000) return 'stale'; // 2 minutes
        return 'connected';
    }, [isError, lastServerSync]);

    // Cleanup function for when projectId changes or component unmounts completely
    const cleanupTimer = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (syncIntervalRef.current) {
            clearInterval(syncIntervalRef.current);
            syncIntervalRef.current = null;
        }

        // Update persistent state one last time
        updatePersistedState();
    }, [updatePersistedState]);

    // Cleanup on unmount or projectId change
    useEffect(() => {
        return cleanupTimer;
    }, [cleanupTimer]);

    return {
        // State
        elapsedTime,
        timerState,
        isRunning,
        isPaused,
        isCheckedOut,
        isIdle,

        // Formatted values
        formattedTime: formatTime(elapsedTime),

        // Actions
        checkIn: checkInMutation.mutate,
        pauseOrResume: pauseOrResumeMutation.mutate,
        checkOut: checkOutMutation.mutate,
        syncWithServer,

        // Loading states
        isCheckingIn: checkInMutation.isLoading,
        isPausingOrResuming: pauseOrResumeMutation.isLoading,
        isCheckingOut: checkOutMutation.isLoading,

        // Advanced info
        serverTimeData,
        connectionStatus,
        lastServerSync,
        syncDrift,

        // Helper
        formatTime,

        // Cleanup function for manual cleanup if needed
        cleanup: cleanupTimer
    };
};