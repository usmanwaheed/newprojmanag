import React, { useState } from 'react';
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    ListItemText,
    ListItemAvatar,
    Avatar,
    Typography,
    Box,
    Divider,
    Button,
    Chip,
    List,
    ListItem,
    CircularProgress,
    Tooltip
} from '@mui/material';

import {
    Notifications as NotificationsIcon,
    NotificationsActive,
    Task as TaskIcon,
    VideoLibrary as VideoIcon,
    Business as BusinessIcon,
    Warning as WarningIcon,
    MarkEmailRead as MarkEmailReadIcon
} from '@mui/icons-material';

import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import {
    useNotifications,
    useUnreadCount,
    useMarkNotificationsAsRead,
    useMarkAllNotificationsAsRead
} from '../api/notificationApi';

// import {
//     useNotifications,
//     useUnreadCount,
//     useMarkNotificationsAsRead,
//     useMarkAllNotificationsAsRead
// } from '../api/notificationApi';

// Notification type icons mapping
const getNotificationIcon = (type) => {
    const iconMap = {
        'TASK_ASSIGNED': <TaskIcon fontSize="small" />,
        'TASK_STATUS_CHANGED': <TaskIcon fontSize="small" />,
        'TASK_APPROVED': <TaskIcon fontSize="small" />,
        'TASK_REJECTED': <TaskIcon fontSize="small" />,
        'TASK_DUE_SOON': <WarningIcon fontSize="small" />,
        'RECORDING_UPLOADED': <VideoIcon fontSize="small" />,
        'RECORDING_APPROVED': <VideoIcon fontSize="small" />,
        'RECORDING_REJECTED': <VideoIcon fontSize="small" />,
        'RECORDING_COMMENTED': <VideoIcon fontSize="small" />,
        'USER_ADDED_TO_COMPANY': <BusinessIcon fontSize="small" />,
        'TRIAL_EXPIRING': <WarningIcon fontSize="small" />,
        'SUBSCRIPTION_ACTIVATED': <BusinessIcon fontSize="small" />,
        'default': <NotificationsIcon fontSize="small" />
    };
    return iconMap[type] || iconMap.default;
};

// Priority color mapping
const getPriorityColor = (priority) => {
    const colorMap = {
        'low': 'default',
        'medium': 'primary',
        'high': 'error'
    };
    return colorMap[priority] || 'default';
};

const NotificationBell = () => {
    const navigate = useNavigate();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    // Fetch recent notifications (limit to 5 for dropdown)
    const {
        data: notificationsData,
        isLoading,
        refetch
    } = useNotifications({
        page: 1,
        limit: 5,
        unreadOnly: false
    });

    const { data: unreadCountData } = useUnreadCount();
    const markAsReadMutation = useMarkNotificationsAsRead();
    const markAllAsReadMutation = useMarkAllNotificationsAsRead();

    const notifications = notificationsData?.data?.notifications || [];
    const unreadCount = unreadCountData?.data?.unreadCount || 0;

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
        refetch(); // Refresh notifications when opened
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read if unread
        if (!notification.isRead) {
            try {
                await markAsReadMutation.mutateAsync([notification._id]);
            } catch (error) {
                console.error('Failed to mark notification as read:', error);
            }
        }

        handleClose();

        // Handle navigation based on action button
        if (notification.actionButton) {
            switch (notification.actionButton.action) {
                case 'VIEW_TASK':
                    if (notification.data?.taskId) {
                        navigate(`/tasks/${notification.data.taskId}`);
                    }
                    break;
                case 'VIEW_RECORDING':
                    if (notification.data?.recordingId) {
                        navigate(`/recordings/${notification.data.recordingId}`);
                    }
                    break;
                case 'VIEW_DASHBOARD':
                    navigate('/dashboard');
                    break;
                default:
                    break;
            }
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await markAllAsReadMutation.mutateAsync();
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark all notifications as read');
        }
    };

    return (
        <>
            <Tooltip title="Notifications">
                <IconButton
                    color="inherit"
                    onClick={handleClick}
                    aria-label="notifications"
                    aria-controls="notification-menu"
                    aria-haspopup="true"
                >
                    <Badge badgeContent={unreadCount} color="error">
                        {unreadCount > 0 ? (
                            <NotificationsActive />
                        ) : (
                            <NotificationsIcon />
                        )}
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
                PaperProps={{
                    sx: {
                        width: 400,
                        maxWidth: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: 2 }}>
                    <Box sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 1
                    }}>
                        <Typography variant="h6" component="div">
                            Notifications
                        </Typography>
                        {unreadCount > 0 && (
                            <Button
                                size="small"
                                onClick={handleMarkAllAsRead}
                                disabled={markAllAsReadMutation.isLoading}
                                startIcon={<MarkEmailReadIcon fontSize="small" />}
                            >
                                Mark all read
                            </Button>
                        )}
                    </Box>
                    <Divider />
                </Box>

                {isLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                        <CircularProgress size={24} />
                    </Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ p: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No notifications to display
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {notifications.map((notification) => (
                            <MenuItem
                                key={notification._id}
                                onClick={() => handleNotificationClick(notification)}
                                sx={{
                                    backgroundColor: notification.isRead ? 'inherit' : 'action.hover',
                                    '&:hover': {
                                        backgroundColor: 'action.selected'
                                    }
                                }}
                            >
                                <ListItemAvatar>
                                    <Avatar sx={{
                                        bgcolor: getPriorityColor(notification.priority) + '.light',
                                        width: 32,
                                        height: 32
                                    }}>
                                        {getNotificationIcon(notification.type)}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Typography
                                                variant="subtitle2"
                                                sx={{
                                                    fontWeight: notification.isRead ? 'normal' : 'bold',
                                                    flex: 1
                                                }}
                                            >
                                                {notification.title}
                                            </Typography>
                                            {!notification.isRead && (
                                                <Box
                                                    sx={{
                                                        width: 8,
                                                        height: 8,
                                                        borderRadius: '50%',
                                                        backgroundColor: 'primary.main'
                                                    }}
                                                />
                                            )}
                                        </Box>
                                    }
                                    secondary={
                                        <>
                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{
                                                    display: '-webkit-box',
                                                    WebkitLineClamp: 2,
                                                    WebkitBoxOrient: 'vertical',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis'
                                                }}
                                            >
                                                {notification.message}
                                            </Typography>
                                            <Box sx={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                mt: 0.5
                                            }}>
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatDistanceToNow(new Date(notification.createdAt), {
                                                        addSuffix: true
                                                    })}
                                                </Typography>
                                                <Chip
                                                    label={notification.priority}
                                                    size="small"
                                                    color={getPriorityColor(notification.priority)}
                                                />
                                            </Box>
                                        </>
                                    }
                                    sx={{ my: 0 }}
                                />
                            </MenuItem>
                        ))}
                    </List>
                )}

                {notifications.length > 0 && (
                    <Box sx={{ p: 1, textAlign: 'center' }}>
                        <Button
                            size="small"
                            onClick={() => navigate('/notifications')}
                            sx={{ textTransform: 'none' }}
                        >
                            View all notifications
                        </Button>
                    </Box>
                )}
            </Menu>
        </>
    );
};

export default NotificationBell;