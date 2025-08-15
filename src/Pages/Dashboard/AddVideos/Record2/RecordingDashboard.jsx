// 3. RecordingDashboard.jsx - Main dashboard page
import React, { useState } from 'react';
import {
    Box, Container, Grid, Card, CardContent, Typography, Button,
    Tabs, Tab, Paper, Chip, CircularProgress, Alert
} from '@mui/material';
import {
    VideoCall, PlayArrow, Pending, CheckCircle, Cancel,
    Analytics, People, VideoLibrary
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import {
    useGetUserRecordings,
    useGetCompanyRecordings,
    useGetPendingApprovals,
    useGetRecordingAnalytics
} from './RecordingService';

const RecordingDashboard = () => {
    const [tabValue, setTabValue] = useState(0);
    const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
    const navigate = useNavigate();

    // Use the TanStack Query hooks
    const {
        data: userRecordings,
        isLoading: userRecordingsLoading,
        error: userRecordingsError
    } = useGetUserRecordings();

    const {
        data: companyRecordings,
        isLoading: companyRecordingsLoading,
        error: companyRecordingsError
    } = useGetCompanyRecordings();

    const {
        data: pendingApprovals,
        isLoading: pendingApprovalsLoading,
        error: pendingApprovalsError
    } = useGetPendingApprovals();

    const {
        data: analyticsData,
        isLoading: analyticsLoading,
        error: analyticsError
    } = useGetRecordingAnalytics();

    // Determine which data to display based on the active tab
    const getCurrentData = () => {
        switch (tabValue) {
            case 0:
                return {
                    data: userRecordings?.recordings || [],
                    loading: userRecordingsLoading,
                    error: userRecordingsError
                };
            case 1:
                return {
                    data: companyRecordings?.recordings || [],
                    loading: companyRecordingsLoading,
                    error: companyRecordingsError
                };
            case 2:
                return {
                    data: pendingApprovals || [],
                    loading: pendingApprovalsLoading,
                    error: pendingApprovalsError
                };
            case 3:
                return {
                    data: [],
                    analytics: analyticsData,
                    loading: analyticsLoading,
                    error: analyticsError
                };
            default:
                return { data: [], loading: false, error: null };
        }
    };

    const { data, analytics, loading, error } = getCurrentData();

    const handleStartRecording = () => {
        navigate('/recording/new');
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const StatsCard = ({ title, value, icon, color = 'primary' }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                    <Box
                        sx={{
                            p: 1,
                            borderRadius: 1,
                            bgcolor: `${color}.light`,
                            color: `${color}.main`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {icon}
                    </Box>
                    <Box>
                        <Typography variant="h4" component="div" fontWeight="bold">
                            {value}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {title}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    const RecordingCard = ({ recording }) => (
        <Card sx={{ mb: 2 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
                    <Box>
                        <Typography variant="h6" component="div">
                            {recording.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {recording.description}
                        </Typography>
                    </Box>
                    <Chip
                        label={recording.approvalStatus}
                        color={getStatusColor(recording.approvalStatus)}
                        size="small"
                    />
                </Box>

                <Box display="flex" gap={2} mb={2}>
                    <Typography variant="body2">
                        Duration: {formatDuration(recording.videoDuration)}
                    </Typography>
                    <Typography variant="body2">
                        Views: {recording.viewCount}
                    </Typography>
                    <Typography variant="body2">
                        Created: {new Date(recording.createdAt).toLocaleDateString()}
                    </Typography>
                </Box>

                <Box display="flex" gap={1}>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => navigate(`/recording/${recording._id}`)}
                    >
                        View Details
                    </Button>
                    {recording.recordedBy._id === user._id && (
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => navigate(`/recording/edit/${recording._id}`)}
                        >
                            Edit
                        </Button>
                    )}
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1">
                    Recording Dashboard
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<VideoCall />}
                    onClick={handleStartRecording}
                    size="large"
                >
                    Start Recording
                </Button>
            </Box>

            {/* Analytics Cards */}
            {analytics && (
                <Grid container spacing={3} mb={4}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Total Recordings"
                            value={analytics.overview.totalRecordings}
                            icon={<VideoLibrary />}
                            color="primary"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Approved"
                            value={analytics.overview.approvedRecordings}
                            icon={<CheckCircle />}
                            color="success"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Pending"
                            value={analytics.overview.pendingRecordings}
                            icon={<Pending />}
                            color="warning"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatsCard
                            title="Total Views"
                            value={analytics.overview.totalViews}
                            icon={<Analytics />}
                            color="info"
                        />
                    </Grid>
                </Grid>
            )}

            {/* Tabs */}
            <Paper sx={{ mb: 3 }}>
                <Tabs
                    value={tabValue}
                    onChange={(e, newValue) => setTabValue(newValue)}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab label="My Recordings" icon={<VideoLibrary />} />
                    {(user.role === 'company' || user.role === 'qcadmin') && (
                        <Tab label="Company Recordings" icon={<People />} />
                    )}
                    {(user.role === 'company' || user.role === 'qcadmin') && (
                        <Tab label="Pending Approvals" icon={<Pending />} />
                    )}
                    {user.role === 'company' && (
                        <Tab label="Analytics" icon={<Analytics />} />
                    )}
                </Tabs>
            </Paper>

            {/* Content */}
            {loading ? (
                <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress />
                </Box>
            ) : error ? (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error.message}
                </Alert>
            ) : (
                <Box>
                    {tabValue < 3 && (
                        <>
                            {data.length === 0 ? (
                                <Paper sx={{ p: 4, textAlign: 'center' }}>
                                    <Typography variant="h6" color="text.secondary">
                                        No recordings found
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" mt={1}>
                                        Start recording to see your videos here
                                    </Typography>
                                </Paper>
                            ) : (
                                data.map((recording) => (
                                    <RecordingCard key={recording._id} recording={recording} />
                                ))
                            )}
                        </>
                    )}

                    {tabValue === 3 && analytics && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Overview
                                        </Typography>
                                        <Box display="flex" flexDirection="column" gap={2}>
                                            <Box display="flex" justifyContent="space-between">
                                                <span>Total Recordings:</span>
                                                <strong>{analytics.overview.totalRecordings}</strong>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <span>Approved:</span>
                                                <strong>{analytics.overview.approvedRecordings}</strong>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <span>Pending:</span>
                                                <strong>{analytics.overview.pendingRecordings}</strong>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <span>Rejected:</span>
                                                <strong>{analytics.overview.rejectedRecordings}</strong>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between">
                                                <span>Total Views:</span>
                                                <strong>{analytics.overview.totalViews}</strong>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Top Contributors
                                        </Typography>
                                        {analytics.topUsers.map((userStat, index) => (
                                            <Box key={index} display="flex" justifyContent="space-between" mb={1}>
                                                <span>{userStat.user?.name || 'Unknown'}</span>
                                                <strong>{userStat.recordingCount} recordings</strong>
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}
                </Box>
            )}
        </Container>
    );
};

export default RecordingDashboard;