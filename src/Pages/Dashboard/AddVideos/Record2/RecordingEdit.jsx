import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    Chip,
    Stack,
    Alert,
    CircularProgress,
    Breadcrumbs,
    Link,
    Divider
} from '@mui/material';
import {
    Save,
    Cancel,
    ArrowBack
} from '@mui/icons-material';
import {
    useGetRecordingById,
    useUpdateRecording
} from './RecordingService';
import { useAuth } from '../../../../context/AuthProvider';

const RecordingEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        tags: ''
    });
    const [errors, setErrors] = useState({});

    const { data: recordingData, isLoading, error } = useGetRecordingById(id);
    const updateRecordingMutation = useUpdateRecording();

    const recording = recordingData?.data;

    useEffect(() => {
        if (recording) {
            setFormData({
                title: recording.title || '',
                description: recording.description || '',
                tags: recording.tags ? recording.tags.join(', ') : ''
            });
        }
    }, [recording]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        } else if (formData.title.trim().length < 3) {
            newErrors.title = 'Title must be at least 3 characters';
        }

        if (formData.description.length > 1000) {
            newErrors.description = 'Description must be less than 1000 characters';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field) => (e) => {
        setFormData({
            ...formData,
            [field]: e.target.value
        });

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors({
                ...errors,
                [field]: null
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const updateData = {
            title: formData.title.trim(),
            description: formData.description.trim(),
            tags: formData.tags.trim()
        };

        updateRecordingMutation.mutate({
            id,
            data: updateData
        }, {
            onSuccess: () => {
                navigate(`/recordings/${id}`);
            },
            onError: (error) => {
                console.error('Update failed:', error);
            }
        });
    };

    const handleCancel = () => {
        navigate(`/recordings/${id}`);
    };

    const canEdit = recording?.recordedBy?._id === user?.id || user?.role === 'company';

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (error || !recording) {
        return (
            <Alert severity="error">
                Recording not found or access denied
            </Alert>
        );
    }

    if (!canEdit) {
        return (
            <Alert severity="warning">
                You don't have permission to edit this recording
            </Alert>
        );
    }

    // Check if recording is approved and user is not company owner
    if (recording.approvalStatus === 'approved' && user.role !== 'company') {
        return (
            <Alert severity="info">
                Approved recordings can only be edited by company owners
            </Alert>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 3 }}>
                <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate('/recordings')}
                    sx={{ textDecoration: 'none' }}
                >
                    Recordings
                </Link>
                <Link
                    component="button"
                    variant="body2"
                    onClick={() => navigate(`/recordings/${id}`)}
                    sx={{ textDecoration: 'none' }}
                >
                    {recording.title}
                </Link>
                <Typography variant="body2" color="text.primary">
                    Edit
                </Typography>
            </Breadcrumbs>

            <Grid container spacing={3}>
                {/* Left Column - Edit Form */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h5" gutterBottom>
                                Edit Recording
                            </Typography>

                            {updateRecordingMutation.error && (
                                <Alert severity="error" sx={{ mb: 2 }}>
                                    {updateRecordingMutation.error?.response?.data?.message || 'Failed to update recording'}
                                </Alert>
                            )}

                            <form onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    {/* Title */}
                                    <TextField
                                        label="Title"
                                        value={formData.title}
                                        onChange={handleInputChange('title')}
                                        error={!!errors.title}
                                        helperText={errors.title}
                                        fullWidth
                                        required
                                        variant="outlined"
                                    />

                                    {/* Description */}
                                    <TextField
                                        label="Description"
                                        value={formData.description}
                                        onChange={handleInputChange('description')}
                                        error={!!errors.description}
                                        helperText={errors.description || `${formData.description.length}/1000 characters`}
                                        fullWidth
                                        multiline
                                        rows={4}
                                        variant="outlined"
                                        placeholder="Enter recording description..."
                                    />

                                    {/* Tags */}
                                    <TextField
                                        label="Tags"
                                        value={formData.tags}
                                        onChange={handleInputChange('tags')}
                                        fullWidth
                                        variant="outlined"
                                        placeholder="Enter tags separated by commas"
                                        helperText="Separate multiple tags with commas (e.g., tutorial, demo, training)"
                                    />

                                    {/* Tag Preview */}
                                    {formData.tags.trim() && (
                                        <Box>
                                            <Typography variant="subtitle2" gutterBottom>
                                                Tag Preview:
                                            </Typography>
                                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                                {formData.tags.split(',').map((tag, index) => {
                                                    const trimmedTag = tag.trim();
                                                    return trimmedTag ? (
                                                        <Chip
                                                            key={index}
                                                            label={trimmedTag}
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ) : null;
                                                })}
                                            </Stack>
                                        </Box>
                                    )}

                                    <Divider />

                                    {/* Action Buttons */}
                                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                                        <Button
                                            variant="outlined"
                                            startIcon={<Cancel />}
                                            onClick={handleCancel}
                                            disabled={updateRecordingMutation.isPending}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            startIcon={<Save />}
                                            disabled={updateRecordingMutation.isPending}
                                        >
                                            {updateRecordingMutation.isPending ? 'Saving...' : 'Save Changes'}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column - Recording Preview */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Recording Preview
                            </Typography>

                            {/* Video Thumbnail */}
                            <Box
                                sx={{
                                    width: '100%',
                                    aspectRatio: '16/9',
                                    backgroundColor: '#f5f5f5',
                                    borderRadius: 1,
                                    mb: 2,
                                    backgroundImage: recording.thumbnailUrl ? `url(${recording.thumbnailUrl})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {!recording.thumbnailUrl && (
                                    <Typography variant="body2" color="textSecondary">
                                        Video Thumbnail
                                    </Typography>
                                )}
                            </Box>

                            {/* Recording Details */}
                            <Stack spacing={2}>
                                <Box>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Duration
                                    </Typography>
                                    <Typography variant="body2">
                                        {Math.floor(recording.videoDuration / 60)}:{(recording.videoDuration % 60).toString().padStart(2, '0')}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Status
                                    </Typography>
                                    <Chip
                                        label={recording.approvalStatus}
                                        color={
                                            recording.approvalStatus === 'approved' ? 'success' :
                                                recording.approvalStatus === 'rejected' ? 'error' :
                                                    'warning'
                                        }
                                        size="small"
                                    />
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Created
                                    </Typography>
                                    <Typography variant="body2">
                                        {new Date(recording.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" color="textSecondary">
                                        Views
                                    </Typography>
                                    <Typography variant="body2">
                                        {recording.viewCount} views
                                    </Typography>
                                </Box>

                                {recording.associatedTask && (
                                    <Box>
                                        <Typography variant="subtitle2" color="textSecondary">
                                            Associated Task
                                        </Typography>
                                        <Typography variant="body2">
                                            {recording.associatedTask.projectTitle}
                                        </Typography>
                                    </Box>
                                )}
                            </Stack>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default RecordingEdit;