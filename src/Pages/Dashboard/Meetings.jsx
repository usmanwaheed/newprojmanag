import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  IconButton,
  Button,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  Checkbox,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel,
  Stack,
  Divider,
  Badge,
  CircularProgress,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';

import {
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
  Delete as DeleteIcon,
  DeleteOutline as DeleteOutlineIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  NotificationsActive,
  Task as TaskIcon,
  VideoLibrary as VideoIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

import { formatDistanceToNow } from 'date-fns';
import { toast } from 'react-toastify';
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationsAsRead,
  useMarkAllNotificationsAsRead,
  useDeleteNotification,
  useDeleteNotifications
} from '../../api/notificationApi';
// Notification type icons mapping
const getNotificationIcon = (type) => {
  const iconMap = {
    'TASK_ASSIGNED': <TaskIcon />,
    'TASK_STATUS_CHANGED': <TaskIcon />,
    'TASK_APPROVED': <TaskIcon />,
    'TASK_REJECTED': <TaskIcon />,
    'TASK_DUE_SOON': <WarningIcon />,
    'RECORDING_UPLOADED': <VideoIcon />,
    'RECORDING_APPROVED': <VideoIcon />,
    'RECORDING_REJECTED': <VideoIcon />,
    'RECORDING_COMMENTED': <VideoIcon />,
    'USER_ADDED_TO_COMPANY': <BusinessIcon />,
    'TRIAL_EXPIRING': <WarningIcon />,
    'SUBSCRIPTION_ACTIVATED': <BusinessIcon />,
    'default': <NotificationsIcon />
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

const Meetings = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [bulkActionDialog, setBulkActionDialog] = useState(false);

  // Queries and Mutations
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch
  } = useNotifications({
    page,
    limit,
    unreadOnly,
    type: typeFilter || null
  });

  const { data: unreadCountData } = useUnreadCount();
  const markAsReadMutation = useMarkNotificationsAsRead();
  const markAllAsReadMutation = useMarkAllNotificationsAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const deleteNotificationsMutation = useDeleteNotifications();

  const notifications = notificationsData?.data?.notifications || [];
  const pagination = notificationsData?.data?.pagination || {};
  const unreadCount = unreadCountData?.data?.unreadCount || 0;

  // Handle menu operations
  const handleMenuClick = (event, notification) => {
    setMenuAnchor(event.currentTarget);
    setSelectedNotification(notification);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedNotification(null);
  };

  // Handle notification selection
  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      }
      return [...prev, notificationId];
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === notifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(notifications.map(n => n._id));
    }
  };

  // Handle mark as read
  const handleMarkAsRead = async (notificationIds) => {
    try {
      await markAsReadMutation.mutateAsync(notificationIds);
      toast.success('Notifications marked as read');
      setSelectedNotifications([]);
      handleMenuClose();
    } catch (error) {
      toast.error('Failed to mark notifications as read');
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

  // Handle delete
  const handleDeleteNotification = async (notificationId) => {
    try {
      await deleteNotificationMutation.mutateAsync(notificationId);
      toast.success('Notification deleted');
      setSelectedNotifications(prev => prev.filter(id => id !== notificationId));
      handleMenuClose();
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleDeleteSelected = async () => {
    try {
      await deleteNotificationsMutation.mutateAsync(selectedNotifications);
      toast.success(`${selectedNotifications.length} notifications deleted`);
      setSelectedNotifications([]);
      setBulkActionDialog(false);
    } catch (error) {
      toast.error('Failed to delete notifications');
    }
  };

  // Handle notification click (mark as read if unread)
  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      handleMarkAsRead([notification._id]);
    }

    // Handle action button click
    if (notification.actionButton) {
      switch (notification.actionButton.action) {
        case 'VIEW_TASK':
          // Navigate to task
          console.log('Navigate to task:', notification.data?.taskId);
          break;
        case 'VIEW_RECORDING':
          // Navigate to recording
          console.log('Navigate to recording:', notification.data?.recordingId);
          break;
        case 'VIEW_DASHBOARD':
          // Navigate to dashboard
          console.log('Navigate to dashboard');
          break;
        default:
          break;
      }
    }
  };

  // Available notification types for filter
  const notificationTypes = [
    'TASK_ASSIGNED',
    'TASK_STATUS_CHANGED',
    'TASK_APPROVED',
    'TASK_REJECTED',
    'RECORDING_UPLOADED',
    'RECORDING_APPROVED',
    'USER_ADDED_TO_COMPANY'
  ];

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load notifications. Please try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsActive color="primary" />
          </Badge>
          <Typography variant="h5" component="h1">
            Notifications
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={refetch} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>

          {unreadCount > 0 && (
            <Button
              variant="outlined"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isLoading}
              startIcon={<MarkEmailReadIcon />}
            >
              Mark All Read
            </Button>
          )}
        </Box>
      </Box>

      {/* Filters and Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={2}>
          <FormControlLabel
            control={
              <Switch
                checked={unreadOnly}
                onChange={(e) => {
                  setUnreadOnly(e.target.checked);
                  setPage(1);
                }}
              />
            }
            label="Unread only"
          />

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Type</InputLabel>
            <Select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              label="Type"
            >
              <MenuItem value="">All Types</MenuItem>
              {notificationTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type.replace(/_/g, ' ')}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {selectedNotifications.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="text.secondary">
                {selectedNotifications.length} selected
              </Typography>
              <Button
                size="small"
                onClick={() => handleMarkAsRead(selectedNotifications)}
                disabled={markAsReadMutation.isLoading}
                startIcon={<MarkEmailReadIcon />}
              >
                Mark Read
              </Button>
              <Button
                size="small"
                color="error"
                onClick={() => setBulkActionDialog(true)}
                disabled={deleteNotificationsMutation.isLoading}
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedNotifications([])}
                startIcon={<ClearIcon />}
              >
                Clear
              </Button>
            </>
          )}

          {notifications.length > 0 && (
            <Button
              size="small"
              onClick={handleSelectAll}
              startIcon={<SelectAllIcon />}
            >
              {selectedNotifications.length === notifications.length ? 'Deselect All' : 'Select All'}
            </Button>
          )}
        </Stack>
      </Paper>

      {/* Notifications List */}
      <Paper>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <NotificationsIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No notifications found
            </Typography>
          </Box>
        ) : (
          <List>
            {notifications.map((notification, index) => (
              <React.Fragment key={notification._id}>
                <ListItem
                  sx={{
                    backgroundColor: notification.isRead ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.selected' }
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedNotifications.includes(notification._id)}
                      onChange={() => handleSelectNotification(notification._id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </ListItemIcon>

                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: getPriorityColor(notification.priority) + '.light' }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: notification.isRead ? 'normal' : 'bold',
                            flex: 1
                          }}
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={notification.priority}
                          size="small"
                          color={getPriorityColor(notification.priority)}
                        />
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
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {notification.message}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </Typography>
                          {notification.actionButton && (
                            <Button
                              size="small"
                              variant="text"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotificationClick(notification);
                              }}
                            >
                              {notification.actionButton.text}
                            </Button>
                          )}
                        </Box>
                      </Box>
                    }
                  />

                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMenuClick(e, notification);
                    }}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </ListItem>

                {index < notifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={(e, newPage) => setPage(newPage)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        {selectedNotification && !selectedNotification.isRead && (
          <MenuItem onClick={() => handleMarkAsRead([selectedNotification._id])}>
            <ListItemIcon>
              <MarkEmailReadIcon fontSize="small" />
            </ListItemIcon>
            Mark as Read
          </MenuItem>
        )}
        <MenuItem onClick={() => handleDeleteNotification(selectedNotification?._id)}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          Delete
        </MenuItem>
      </Menu>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkActionDialog} onClose={() => setBulkActionDialog(false)}>
        <DialogTitle>Delete Notifications</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {selectedNotifications.length} notification(s)?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkActionDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteSelected}
            color="error"
            disabled={deleteNotificationsMutation.isLoading}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Meetings;