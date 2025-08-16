// src/Pages/Dashboard/AddProjects/index.jsx
import PropTypes from 'prop-types';
import style from "./style.module.scss"
import { Link, Outlet, useLocation, useParams } from "react-router-dom";
import { useAuth } from '../../../context/AuthProvider';
import ArrowOutwardIcon from '@mui/icons-material/ArrowOutward';
import SouthWestIcon from '@mui/icons-material/SouthWest';
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded';
import SyncIcon from '@mui/icons-material/Sync';
import OverView from "./Overview"
import Teams from "./Teams"
import Assign from "./Assign"
import Videos from "./Videos"
import Time from "./Time"
import Files from "./Files"
import Controls from "./Controls"
import ProjectChat from "./Chat" // Import the new Chat component
import {
    Button, Tab, Tabs,
    IconButton, Stack,
    Typography, Box, Tooltip,
    CircularProgress,
    Badge,
    Chip
} from "@mui/material";
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { toast } from 'react-toastify';
import { userTimeProject } from '../../../api/userTracker';
import { useQuery } from '@tanstack/react-query';
import { RouteNames } from '../../../Constants/route';
import { useOptimizedTimeTracker, TIMER_STATES } from '../../../api/userTracker';
import { useState, useEffect, useMemo } from 'react';

const CustomTabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`simpleTabPanel-${index}`}
            aria-labelledby={`simpleTabPanel-${index}`}
            {...other}>
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    )
}

CustomTabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

const allyProps = (index) => {
    return {
        id: `simpleTab-${index}`,
        'aria-controls': `simpleTab-${index}`
    }
}

export default function AddProjects() {
    const { theme, mode } = useAuth();
    const themeTab = mode === 'light' ? '#36454F' : theme.palette.text.primary;
    const { id: ProjectId } = useParams();
    const location = useLocation('');
    const subDetailsPageVar = location.pathname.includes(`${RouteNames.SUBDETAILSPAGE}`);
    const [activeTab, setActiveTab] = useState(0);

    // Optimized timer hook with persistence - this provides real-time updates
    const {
        elapsedTime,
        timerState,
        isRunning,
        isPaused,
        isCheckedOut,
        isIdle,
        formattedTime, // This is already formatted and updates in real-time
        checkIn,
        pauseOrResume,
        checkOut,
        isCheckingIn,
        isPausingOrResuming,
        isCheckingOut,
        connectionStatus,
        syncWithServer,
        lastServerSync,
        syncDrift,
        formatTime // Helper function from the hook
    } = useOptimizedTimeTracker(ProjectId);

    // User time details - with reduced refetch interval to avoid conflicts
    const { data: userInfo, isLoading: userInfoLoading } = useQuery({
        queryKey: ['userInfo', ProjectId],
        queryFn: () => userTimeProject(ProjectId),
        enabled: !!ProjectId,
        staleTime: 60000, // 1 minute
        refetchInterval: 120000, // 2 minutes - reduced frequency
    });

    const getUserTimeDetails = (key) => {
        const values = userInfo?.data?.entries?.map((e) => e[key])
        return values?.[0] ?? false;
    };

    // Handle tab changes
    const handleChangeTab = (event, newValue) => {
        setActiveTab(newValue);
    };

    // Determine what to show based on timer state and user info
    const shouldShowCheckIn = useMemo(() => {
        return isIdle && !getUserTimeDetails("checkIn") && !getUserTimeDetails("isCheckedOut");
    }, [isIdle, getUserTimeDetails]);

    const shouldShowTimerControls = useMemo(() => {
        return !isIdle && !isCheckedOut && getUserTimeDetails("checkIn") && !getUserTimeDetails("isCheckedOut");
    }, [isIdle, isCheckedOut, getUserTimeDetails]);

    const shouldShowCheckOut = useMemo(() => {
        return !isCheckedOut && getUserTimeDetails("checkIn") && !getUserTimeDetails("isCheckedOut");
    }, [isCheckedOut, getUserTimeDetails]);

    // Get display time with proper fallbacks
    const getDisplayTime = useMemo(() => {
        // If checked out, show total duration from userInfo
        if (getUserTimeDetails("isCheckedOut")) {
            return getUserTimeDetails("totalDuration") || 0;
        }
        // Otherwise show current elapsed time from timer (real-time)
        return elapsedTime || 0;
    }, [getUserTimeDetails, elapsedTime]);

    // Enhanced format time function with better error handling
    const formatDisplayTime = useMemo(() => {
        const seconds = getDisplayTime;
        if (!seconds || isNaN(seconds) || seconds < 0) return "00:00:00";

        const hrs = Math.floor(Math.abs(seconds) / 3600);
        const mins = Math.floor((Math.abs(seconds) % 3600) / 60);
        const secs = Math.abs(seconds) % 60;
        return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }, [getDisplayTime]);

    // Connection status indicator
    const getConnectionStatusColor = () => {
        switch (connectionStatus) {
            case 'connected':
                return 'success.main';
            case 'error':
                return 'error.main';
            case 'stale':
                return 'warning.main';
            default:
                return 'grey.500';
        }
    };

    const getConnectionStatusTooltip = () => {
        const baseTooltip = (() => {
            switch (connectionStatus) {
                case 'connected':
                    return 'Connected to server';
                case 'error':
                    return 'Connection error - click to retry';
                case 'stale':
                    return 'Connection stale - syncing...';
                default:
                    return 'Connecting...';
            }
        })();

        // Add sync drift info if available
        if (syncDrift !== 0 && connectionStatus === 'connected') {
            return `${baseTooltip} (drift: ${syncDrift > 0 ? '+' : ''}${syncDrift}s)`;
        }

        return baseTooltip;
    };

    // Get timer state display
    const getTimerStateChip = () => {
        const stateConfig = {
            [TIMER_STATES.IDLE]: {
                label: 'Idle',
                color: 'default'
            },
            [TIMER_STATES.RUNNING]: {
                label: 'Running',
                color: 'success',
                icon: <PlayArrowRoundedIcon fontSize="small" />
            },
            [TIMER_STATES.PAUSED]: {
                label: 'Paused',
                color: 'warning',
                icon: <PauseIcon fontSize="small" />
            },
            [TIMER_STATES.CHECKED_OUT]: {
                label: 'Completed',
                color: 'info'
            }
        };

        const config = stateConfig[timerState] || stateConfig[TIMER_STATES.IDLE];

        return (
            <Chip
                size="small"
                label={config.label}
                color={config.color}
                icon={config.icon}
                variant="outlined"
                sx={{ ml: 1 }}
            />
        );
    };

    // Styles
    const hoverStyles = mode === "light" ? {
        backgroundColor: "rgba(52, 52, 52, 0.1) !important",
        color: "#343434",
        boxShadow: 0
    } : {
        backgroundColor: "rgba(250, 249, 246, 0.1) !important",
        border: "1px solid transparent",
        color: "#FAF9F6 !important",
    };

    const trackerBtnsStyles = mode === 'light' ? {
        backgroundColor: "#343434 !important",
        color: "#FAF9F6",
        boxShadow: 0
    } : {
        backgroundColor: "#FAF9F6 !important",
        color: "#343434",
        border: "#FAF9F6",
    };

    // Manual sync handler for connection issues
    const handleConnectionClick = () => {
        if (connectionStatus === 'error') {
            syncWithServer();
        }
    };

    // Enhanced timer display with real-time updates
    const TimerDisplay = () => (
        <Stack direction="row" spacing={1} alignItems="center">
            <Typography
                variant="h6"
                sx={{
                    color: theme.palette.text.primary,
                    fontWeight: isRunning ? 600 : 500,
                    transition: 'font-weight 0.2s ease',
                    minWidth: '90px', // Prevent layout shift
                    textAlign: 'center'
                }}
            >
                {formatDisplayTime}
            </Typography>
            {getTimerStateChip()}
        </Stack>
    );

    // Connection status display with sync button
    const ConnectionStatus = () => (
        <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title={getConnectionStatusTooltip()} arrow>
                <Badge
                    variant="dot"
                    color="primary"
                    overlap="circular"
                    sx={{
                        '& .MuiBadge-badge': {
                            backgroundColor: getConnectionStatusColor(),
                            color: getConnectionStatusColor(),
                            boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
                            animation: connectionStatus === 'connecting' || connectionStatus === 'stale'
                                ? 'pulse 2s infinite' : 'none',
                        },
                        '@keyframes pulse': {
                            '0%': {
                                transform: 'scale(0.95)',
                                boxShadow: `0 0 0 0 ${getConnectionStatusColor()}40`,
                            },
                            '70%': {
                                transform: 'scale(1)',
                                boxShadow: `0 0 0 10px ${getConnectionStatusColor()}00`,
                            },
                            '100%': {
                                transform: 'scale(0.95)',
                                boxShadow: `0 0 0 0 ${getConnectionStatusColor()}00`,
                            },
                        },
                    }}
                    onClick={handleConnectionClick}
                    style={{ cursor: connectionStatus === 'error' ? 'pointer' : 'default' }}
                >
                    <Box sx={{ width: 12, height: 12 }} />
                </Badge>
            </Tooltip>

            {(connectionStatus === 'error' || connectionStatus === 'stale') && (
                <Tooltip title="Manual sync">
                    <IconButton
                        size="small"
                        onClick={syncWithServer}
                        sx={{ color: theme.palette.text.secondary }}
                    >
                        <SyncIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            )}
        </Stack>
    );

    // Render timer controls based on state
    const renderTimerControls = () => {
        if (userInfoLoading) {
            return (
                <Stack direction="row" spacing={2} alignItems="center">
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                        Loading...
                    </Typography>
                </Stack>
            );
        }

        if (shouldShowCheckIn) {
            return (
                <Button
                    variant="contained"
                    onClick={checkIn}
                    disabled={isCheckingIn}
                    sx={{
                        ...trackerBtnsStyles,
                        '&:hover': hoverStyles,
                        minWidth: '120px',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {isCheckingIn ? (
                        <CircularProgress size={24} color="inherit" />
                    ) : (
                        <>
                            <PlayArrowRoundedIcon sx={{ mr: 1 }} />
                            Check In
                        </>
                    )}
                </Button>
            );
        }

        if (shouldShowTimerControls) {
            return (
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button
                        variant="contained"
                        onClick={pauseOrResume}
                        disabled={isPausingOrResuming}
                        sx={{
                            ...trackerBtnsStyles,
                            '&:hover': hoverStyles,
                            minWidth: '120px',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isPausingOrResuming ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : isRunning ? (
                            <>
                                <PauseIcon sx={{ mr: 1 }} />
                                Pause
                            </>
                        ) : (
                            <>
                                <PlayArrowRoundedIcon sx={{ mr: 1 }} />
                                Resume
                            </>
                        )}
                    </Button>

                    {shouldShowCheckOut && (
                        <Button
                            variant="contained"
                            onClick={checkOut}
                            disabled={isCheckingOut}
                            sx={{
                                ...trackerBtnsStyles,
                                '&:hover': hoverStyles,
                                minWidth: '120px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isCheckingOut ? (
                                <CircularProgress size={24} color="inherit" />
                            ) : (
                                "Check Out"
                            )}
                        </Button>
                    )}
                </Stack>
            );
        }

        return null;
    };

    // Show last sync time for debugging/info
    const LastSyncInfo = () => {
        if (!lastServerSync || !isRunning) return null;

        const timeSinceSync = Math.floor((Date.now() - lastServerSync) / 1000);
        if (timeSinceSync < 30) return null; // Only show if it's been a while

        return (
            <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem' }}
            >
                Last sync: {timeSinceSync}s ago
            </Typography>
        );
    };

    return (
        <Box>
            {!subDetailsPageVar && (
                <>
                    <Stack flexDirection="row" width="100%" alignItems="center" justifyContent="center">
                        <Link className={style.goBack} to={`/project`}>
                            <IconButton disableRipple >
                                <ArrowBackIosNewIcon sx={{ color: theme.palette.text.primary }} />
                            </IconButton>
                            <Typography className={style.goBackTitle} sx={{ color: theme.palette.text.primary }}>Go Back</Typography>
                        </Link>

                        <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center' }}>
                            <Tabs
                                onChange={handleChangeTab}
                                aria-label="user details tabs"
                                value={activeTab}
                                TabIndicatorProps={{ sx: { display: 'none' } }}
                                sx={{ backgroundColor: theme.palette.background.default }}
                                className={style.Tabs}>
                                <Tab
                                    {...allyProps(0)}
                                    label="Overview"
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 0 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 0 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 0 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />
                                <Tab
                                    label="Docs"
                                    {...allyProps(1)}
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 1 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 1 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 1 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />
                                <Tab
                                    label="Videos"
                                    {...allyProps(2)}
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 2 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 2 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 2 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />
                                <Tab
                                    label="Team"
                                    {...allyProps(3)}
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 3 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 3 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 3 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />
                                <Tab
                                    label="Assign"
                                    {...allyProps(4)}
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 4 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 4 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 4 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />
                                <Tab
                                    label="Leaderboard"
                                    {...allyProps(5)}
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 5 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 5 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 5 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />
                                <Tab
                                    label="Chat"
                                    {...allyProps(6)}
                                    sx={(theme) => ({
                                        backgroundColor: activeTab === 6 ? theme.palette.background.paper : 'transparent',
                                        color: activeTab === 6 ? `${themeTab} !important` : 'grey',
                                        fontWeight: activeTab === 6 ? '600' : '500',
                                        '&.Mui-selected': {
                                            color: theme.palette.grey.darkGrey,
                                        },
                                    })}
                                    className={style.Tab} />

                            </Tabs>
                        </Box>

                        {/* Enhanced Timer Display and Controls Section */}
                        <Stack direction="row" spacing={3} alignItems="center" sx={{ mr: 2 }}>
                            <ConnectionStatus />

                            <Stack direction="column" alignItems="center" spacing={0.5}>
                                <TimerDisplay />
                                <LastSyncInfo />
                            </Stack>

                            {renderTimerControls()}
                        </Stack>
                    </Stack>

                    <CustomTabPanel value={activeTab} index={0}>
                        <OverView />
                    </CustomTabPanel>
                    <CustomTabPanel value={activeTab} index={1}>
                        <Files />
                    </CustomTabPanel>
                    <CustomTabPanel value={activeTab} index={2}>
                        <Videos />
                    </CustomTabPanel>
                    <CustomTabPanel value={activeTab} index={3}>
                        <Teams />
                    </CustomTabPanel>
                    <CustomTabPanel value={activeTab} index={4}>
                        <Assign />
                    </CustomTabPanel>
                    <CustomTabPanel value={activeTab} index={5}>
                        <Time />
                    </CustomTabPanel>
                    <CustomTabPanel value={activeTab} index={6}>
                        <ProjectChat projectId={ProjectId} />
                    </CustomTabPanel>

                </>
            )}
            <Outlet />
        </Box>
    );
}