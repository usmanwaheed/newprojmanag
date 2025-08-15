import React, { useState } from 'react';
import {
  Container, Typography, Box, Grid, Card, CardContent, Tab, Tabs,
  Button, Chip, Avatar, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Menu, MenuItem, Alert, Divider, Stack,
  Paper, LinearProgress, Tooltip, Badge
} from '@mui/material';
import {
  Dashboard, VideoLibrary, PendingActions, Analytics,
  MoreVert, CheckCircle, Cancel, Visibility, Delete,
  Edit, Comment, PlayArrow, FilterList, Search,
  TrendingUp, People, Schedule, VideoCall
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
  useApproveRecording,
  useRejectRecording,
  useDeleteRecording,
  useAddComment,

  useGetCompanyRecordings,
  useGetPendingApprovals,
  useGetRecordingAnalytics,
} from './AddVideos/Record2/RecordingService';
import { useAuth } from '../../context/AuthProvider';
import { RouteNames } from '../../Constants/route';

const Teams = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [actionDialog, setActionDialog] = useState({ open: false, type: null });
  const [rejectReason, setRejectReason] = useState('');
  const [comment, setComment] = useState('');
  const [filters, setFilters] = useState({
    approvalStatus: '',
    recordedBy: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);

  // Query hooks
  const { data: companyRecordings, isLoading: recordingsLoading, refetch: refetchRecordings } = useGetCompanyRecordings(filters);
  const { data: pendingApprovals, isLoading: pendingLoading, refetch: refetchPending } = useGetPendingApprovals();
  const { data: analytics, isLoading: analyticsLoading } = useGetRecordingAnalytics('30');

  // Mutation hooks
  const { mutateAsync: approveRecording, isLoading: approving } = useApproveRecording();
  const { mutateAsync: rejectRecording, isLoading: rejecting } = useRejectRecording();
  const { mutateAsync: deleteRecording, isLoading: deleting } = useDeleteRecording();
  const { mutateAsync: addComment, isLoading: commenting } = useAddComment();

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleActionClick = (recording, action) => {
    setSelectedRecording(recording);
    setActionDialog({ open: true, type: action });
    setAnchorEl(null);
  };

  const handleCloseDialog = () => {
    setActionDialog({ open: false, type: null });
    setSelectedRecording(null);
    setRejectReason('');
    setComment('');
  };

  const handleApprove = async () => {
    try {
      await approveRecording(selectedRecording._id);
      refetchRecordings();
      refetchPending();
      handleCloseDialog();
    } catch (error) {
      console.error('Error approving recording:', error);
    }
  };

  const handleReject = async () => {
    try {
      await rejectRecording({
        id: selectedRecording._id,
        reason: rejectReason
      });
      refetchRecordings();
      refetchPending();
      handleCloseDialog();
    } catch (error) {
      console.error('Error rejecting recording:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRecording(selectedRecording._id);
      refetchRecordings();
      refetchPending();
      handleCloseDialog();
    } catch (error) {
      console.error('Error deleting recording:', error);
    }
  };

  const handleAddComment = async () => {
    try {
      await addComment({
        id: selectedRecording._id,
        comment: comment
      });
      refetchRecordings();
      handleCloseDialog();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const RecordingCard = ({ recording }) => (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" noWrap sx={{ mb: 1, maxWidth: '70%' }}>
              {recording.title}
            </Typography>

            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <Avatar
                src={recording.recordedBy?.avatar}
                sx={{ width: 24, height: 24 }}
              >
                {recording.recordedBy?.name?.[0]?.toUpperCase()}
              </Avatar>
              <Typography variant="body2" color="text.secondary">
                {recording.recordedBy?.name}
              </Typography>
              <Chip
                label={recording.approvalStatus}
                size="small"
                color={getStatusColor(recording.approvalStatus)}
                variant="outlined"
              />
            </Box>

            <Box display="flex" gap={2} mb={2} flexWrap="wrap">
              <Typography variant="caption" color="text.secondary">
                Duration: {formatDuration(recording.videoDuration || 0)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Size: {(recording.videoSize / (1024 * 1024)).toFixed(2)} MB
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Views: {recording.viewCount || 0}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created: {new Date(recording.createdAt).toLocaleDateString()}
              </Typography>
            </Box>

            {recording.description && (
              <Typography variant="body2" color="text.secondary" noWrap>
                {recording.description}
              </Typography>
            )}
          </Box>

          <Box>
            <IconButton
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <MoreVert />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={() => navigate(`/recording/${recording._id}`)}>
                <Visibility sx={{ mr: 1 }} /> View
              </MenuItem>
              {recording.approvalStatus === 'pending' && (
                <>
                  <MenuItem onClick={() => handleActionClick(recording, 'approve')}>
                    <CheckCircle sx={{ mr: 1 }} color="success" /> Approve
                  </MenuItem>
                  <MenuItem onClick={() => handleActionClick(recording, 'reject')}>
                    <Cancel sx={{ mr: 1 }} color="error" /> Reject
                  </MenuItem>
                </>
              )}
              <MenuItem onClick={() => handleActionClick(recording, 'comment')}>
                <Comment sx={{ mr: 1 }} /> Add Comment
              </MenuItem>
              <MenuItem onClick={() => handleActionClick(recording, 'delete')}>
                <Delete sx={{ mr: 1 }} color="error" /> Delete
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Quick action buttons for pending recordings */}
        {recording.approvalStatus === 'pending' && (
          <Box display="flex" gap={1} mt={2}>
            <Button
              size="small"
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => handleActionClick(recording, 'approve')}
              disabled={approving}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<Cancel />}
              onClick={() => handleActionClick(recording, 'reject')}
              disabled={rejecting}
            >
              Reject
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<PlayArrow />}
              // onClick={() => navigate(`/recording/${recording._id}`)}
              onClick={() => navigate(`/${RouteNames.CLIENT}/${RouteNames.SINGLEVIDEO}/${recording._id}`)}
            >
              Review
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const AnalyticsOverview = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {analyticsLoading ? (
        Array.from({ length: 4 }, (_, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card>
              <CardContent>
                <LinearProgress />
              </CardContent>
            </Card>
          </Grid>
        ))
      ) : (
        <>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Recordings
                    </Typography>
                    <Typography variant="h4">
                      {analytics?.data?.overview?.totalRecordings || 0}
                    </Typography>
                  </Box>
                  <VideoLibrary color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Pending Approvals
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {analytics?.data?.overview?.pendingRecordings || 0}
                    </Typography>
                  </Box>
                  <Badge
                    badgeContent={analytics?.data?.overview?.pendingRecordings || 0}
                    color="warning"
                  >
                    <PendingActions color="warning" sx={{ fontSize: 40 }} />
                  </Badge>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Total Views
                    </Typography>
                    <Typography variant="h4">
                      {analytics?.data?.overview?.totalViews || 0}
                    </Typography>
                  </Box>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="text.secondary" gutterBottom>
                      Avg Duration
                    </Typography>
                    <Typography variant="h4">
                      {formatDuration(analytics?.data?.overview?.avgDuration || 0)}
                    </Typography>
                  </Box>
                  <Schedule color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </>
      )}
    </Grid>
  );

  const FilterControls = () => (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
        <TextField
          placeholder="Search recordings..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
          }}
        />

        <TextField
          select
          label="Status"
          value={filters.approvalStatus}
          onChange={(e) => setFilters({ ...filters, approvalStatus: e.target.value })}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="approved">Approved</MenuItem>
          <MenuItem value="rejected">Rejected</MenuItem>
        </TextField>

        <TextField
          select
          label="Sort By"
          value={filters.sortBy}
          onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
          size="small"
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="createdAt">Date Created</MenuItem>
          <MenuItem value="title">Title</MenuItem>
          <MenuItem value="videoDuration">Duration</MenuItem>
          <MenuItem value="viewCount">Views</MenuItem>
        </TextField>

        <TextField
          select
          label="Order"
          value={filters.sortOrder}
          onChange={(e) => setFilters({ ...filters, sortOrder: e.target.value })}
          size="small"
          sx={{ minWidth: 100 }}
        >
          <MenuItem value="desc">Descending</MenuItem>
          <MenuItem value="asc">Ascending</MenuItem>
        </TextField>

        <Button
          variant="outlined"
          startIcon={<FilterList />}
          onClick={() => {
            setFilters({
              approvalStatus: '',
              recordedBy: '',
              sortBy: 'createdAt',
              sortOrder: 'desc'
            });
            setSearchTerm('');
          }}
        >
          Clear Filters
        </Button>
      </Box>
    </Paper>
  );

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Stack>
          <Typography variant="h4" component="h1">
            Recording Management Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.name}! Manage your recordings and track your progress.
          </Typography>
        </Stack>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Analytics />}
            onClick={() => setActiveTab(2)}
          >
            View Analytics
          </Button>
        </Box>
      </Box>

      {/* Analytics Overview */}
      <AnalyticsOverview />

      {/* Navigation Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab
            icon={<VideoLibrary />}
            label={`All Recordings (${companyRecordings?.data?.totalRecordings || 0})`}
            iconPosition="start"
          />
          <Tab
            icon={
              <Badge badgeContent={pendingApprovals?.data?.length || 0} color="error">
                <PendingActions />
              </Badge>
            }
            label="Pending Approvals"
            iconPosition="start"
          />
          <Tab
            icon={<Analytics />}
            label="Analytics"
            iconPosition="start"
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Box>
          <FilterControls />

          {recordingsLoading ? (
            <Box>
              {Array.from({ length: 5 }, (_, i) => (
                <Card key={i} sx={{ mb: 2 }}>
                  <CardContent>
                    <LinearProgress sx={{ mb: 2 }} />
                    <Typography variant="h6">Loading...</Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box>
              {companyRecordings?.data?.recordings?.length > 0 ? (
                companyRecordings.data.recordings
                  .filter(recording =>
                    recording.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    recording.description?.toLowerCase().includes(searchTerm.toLowerCase())
                  )
                  .map((recording) => (
                    <RecordingCard key={recording._id} recording={recording} />
                  ))
              ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <VideoLibrary sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No recordings found
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          {pendingLoading ? (
            <LinearProgress />
          ) : (
            <Box>
              {pendingApprovals?.data?.length > 0 ? (
                pendingApprovals.data.map((recording) => (
                  <RecordingCard key={recording._id} recording={recording} />
                ))
              ) : (
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                  <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    No pending approvals
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All recordings have been reviewed!
                  </Typography>
                </Paper>
              )}
            </Box>
          )}
        </Box>
      )}

      {activeTab === 2 && (
        <Box>
          {/* Detailed Analytics */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Top Contributors (Last 30 days)
                  </Typography>
                  {analytics?.data?.topUsers?.map((userStat, index) => (
                    <Box
                      key={index}
                      display="flex"
                      alignItems="center"
                      justifyContent="space-between"
                      py={1}
                    >
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar src={userStat.user?.avatar}>
                          {userStat.user?.name?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1">
                            {userStat.user?.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatDuration(userStat.totalDuration)} total
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        label={`${userStat.recordingCount} recordings`}
                        size="small"
                      />
                    </Box>
                  )) || <Typography color="text.secondary">No data available</Typography>}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Summary
                  </Typography>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Approval Rate
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {analytics?.data?.overview?.totalRecordings > 0
                          ? Math.round((analytics.data.overview.approvedRecordings / analytics.data.overview.totalRecordings) * 100)
                          : 0
                        }%
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Total Duration
                      </Typography>
                      <Typography variant="h6">
                        {formatDuration(analytics?.data?.overview?.totalDuration || 0)}
                      </Typography>
                    </Box>
                    <Divider />
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Time Range
                      </Typography>
                      <Typography variant="h6">
                        {analytics?.data?.timeRange || 'Last 30 days'}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Action Dialogs */}
      <Dialog open={actionDialog.open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'approve' && 'Approve Recording'}
          {actionDialog.type === 'reject' && 'Reject Recording'}
          {actionDialog.type === 'delete' && 'Delete Recording'}
          {actionDialog.type === 'comment' && 'Add Comment'}
        </DialogTitle>

        <DialogContent>
          {actionDialog.type === 'approve' && (
            <Typography>
              Are you sure you want to approve "{selectedRecording?.title}"?
            </Typography>
          )}

          {actionDialog.type === 'reject' && (
            <Box>
              <Typography gutterBottom>
                Please provide a reason for rejecting "{selectedRecording?.title}":
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                required
              />
            </Box>
          )}

          {actionDialog.type === 'delete' && (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                This action cannot be undone. The recording will be permanently deleted from the system.
              </Alert>
              <Typography>
                Are you sure you want to delete "{selectedRecording?.title}"?
              </Typography>
            </Box>
          )}

          {actionDialog.type === 'comment' && (
            <Box>
              <Typography gutterBottom>
                Add a comment to "{selectedRecording?.title}":
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Enter your comment..."
                required
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {actionDialog.type === 'approve' && (
            <Button
              onClick={handleApprove}
              variant="contained"
              color="success"
              disabled={approving}
            >
              {approving ? 'Approving...' : 'Approve'}
            </Button>
          )}
          {actionDialog.type === 'reject' && (
            <Button
              onClick={handleReject}
              variant="contained"
              color="error"
              disabled={rejecting || !rejectReason.trim()}
            >
              {rejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          )}
          {actionDialog.type === 'delete' && (
            <Button
              onClick={handleDelete}
              variant="contained"
              color="error"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          {actionDialog.type === 'comment' && (
            <Button
              onClick={handleAddComment}
              variant="contained"
              disabled={commenting || !comment.trim()}
            >
              {commenting ? 'Adding...' : 'Add Comment'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Teams;