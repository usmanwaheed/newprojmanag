import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Chip,
    Button,
    Grid,
    Avatar,
    Divider,
    TextField,
    List,
    ListItem,
    ListItemAvatar,
    ListItemText,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Paper,
    Stack
} from '@mui/material';
import {
    PlayArrow,
    Edit,
    Delete,
    Comment,
    ThumbUp,
    ThumbDown,
    Download,
    Share,
    Visibility
} from '@mui/icons-material';
import { useAuth } from '../../../../context/AuthProvider';
import {
    useGetRecordingById,
    useAddComment,
    useUpdateRecording,
    useDeleteRecording,
    useApproveRecording,
    useRejectRecording
} from './RecordingService';

const RecordingDetails = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [editMode, setEditMode] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState(false);
    const [rejectDialog, setRejectDialog] = useState(false);
    const [comment, setComment] = useState('');
    const [rejectReason, setRejectReason] = useState('');
    const [editData, setEditData] = useState({
        title: '',
        description: '',
        tags: ''
    });

    const { data: recordingData, isLoading, error } = useGetRecordingById(id);
    const addCommentMutation = useAddComment();
    const updateRecordingMutation = useUpdateRecording();
    const deleteRecordingMutation = useDeleteRecording();
    const approveRecordingMutation = useApproveRecording();
    const rejectRecordingMutation = useRejectRecording();

    const recording = recordingData?.data;

    const canApprove = user?.role === 'company' || user?.role === 'qcadmin';
    const canEdit = recording?.recordedBy?._id === user?.id || user?.role === 'company';
    const canDelete = recording?.recordedBy?._id === user?.id || user?.role === 'company';

    const handleEditSave = () => {
        updateRecordingMutation.mutate({
            id,
            data: {
                title: editData.title,
                description: editData.description,
                tags: editData.tags
            }
        }, {
            onSuccess: () => {
                setEditMode(false);
            }
        });
    };

    const handleAddComment = () => {
        if (!comment.trim()) return;

        addCommentMutation.mutate({
            id,
            comment: comment.trim()
        }, {
            onSuccess: () => {
                setComment('');
            }
        });
    };

    const handleApprove = () => {
        approveRecordingMutation.mutate(id);
    };

    const handleReject = () => {
        rejectRecordingMutation.mutate({
            id,
            reason: rejectReason
        }, {
            onSuccess: () => {
                setRejectDialog(false);
                setRejectReason('');
            }
        });
    };

    const handleDelete = () => {
        deleteRecordingMutation.mutate(id, {
            onSuccess: () => {
                // Navigate back or show success message
                setDeleteDialog(false);
            }
        });
    };

    const formatDuration = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

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

    return (
        <Box sx={{ p: 3 }}>
            {/* Video Player Section */}
            <Card sx={{ mb: 3 }}>
                <Box sx={{ position: 'relative', paddingTop: '56.25%', backgroundColor: '#000' }}>
                    <video
                        controls
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%'
                        }}
                        src={recording.videoUrl}
                        poster={recording.thumbnailUrl}
                    />
                </Box>
            </Card>

            <Grid container spacing={3}>
                {/* Left Column - Recording Details */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            {/* Title and Actions */}
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                <Box flex={1}>
                                    {editMode ? (
                                        <TextField
                                            fullWidth
                                            value={editData.title}
                                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                            variant="outlined"
                                            size="small"
                                        />
                                    ) : (
                                        <Typography variant="h5" gutterBottom>
                                            {recording.title}
                                        </Typography>
                                    )}

                                    <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                                        <Chip
                                            label={recording.approvalStatus}
                                            color={getStatusColor(recording.approvalStatus)}
                                            size="small"
                                        />
                                        <Typography variant="body2" color="textSecondary">
                                            {recording.viewCount} views
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            Duration: {formatDuration(recording.videoDuration)}
                                        </Typography>
                                    </Stack>
                                </Box>

                                <Stack direction="row" spacing={1}>
                                    {canEdit && (
                                        <IconButton onClick={() => {
                                            if (editMode) {
                                                handleEditSave();
                                            } else {
                                                setEditData({
                                                    title: recording.title,
                                                    description: recording.description,
                                                    tags: recording.tags.join(', ')
                                                });
                                                setEditMode(true);
                                            }
                                        }}>
                                            <Edit />
                                        </IconButton>
                                    )}
                                    {canDelete && (
                                        <IconButton onClick={() => setDeleteDialog(true)} color="error">
                                            <Delete />
                                        </IconButton>
                                    )}
                                    <IconButton>
                                        <Share />
                                    </IconButton>
                                    <IconButton>
                                        <Download />
                                    </IconButton>
                                </Stack>
                            </Box>

                            {/* Description */}
                            {editMode ? (
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    variant="outlined"
                                    placeholder="Description"
                                    sx={{ mb: 2 }}
                                />
                            ) : (
                                <Typography variant="body1" paragraph>
                                    {recording.description || 'No description provided'}
                                </Typography>
                            )}

                            {/* Tags */}
                            <Box mb={2}>
                                <Typography variant="subtitle2" gutterBottom>Tags:</Typography>
                                {editMode ? (
                                    <TextField
                                        fullWidth
                                        value={editData.tags}
                                        onChange={(e) => setEditData({ ...editData, tags: e.target.value })}
                                        variant="outlined"
                                        size="small"
                                        placeholder="Comma separated tags"
                                    />
                                ) : (
                                    <Stack direction="row" spacing={1} flexWrap="wrap">
                                        {recording.tags.map((tag, index) => (
                                            <Chip key={index} label={tag} size="small" variant="outlined" />
                                        ))}
                                    </Stack>
                                )}
                            </Box>

                            {/* Approval Actions */}
                            {canApprove && recording.approvalStatus === 'pending' && (
                                <Box display="flex" gap={2} mb={2}>
                                    <Button
                                        variant="contained"
                                        color="success"
                                        startIcon={<ThumbUp />}
                                        onClick={handleApprove}
                                        disabled={approveRecordingMutation.isPending}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        startIcon={<ThumbDown />}
                                        onClick={() => setRejectDialog(true)}
                                    >
                                        Reject
                                    </Button>
                                </Box>
                            )}

                            <Divider sx={{ my: 2 }} />

                            {/* Recording Info */}
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">Recorded by</Typography>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar
                                            src={recording.recordedBy.avatar}
                                            sx={{ width: 24, height: 24 }}
                                        >
                                            {recording.recordedBy.name?.[0]}
                                        </Avatar>
                                        <Typography variant="body2">{recording.recordedBy.name}</Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="body2" color="textSecondary">Created</Typography>
                                    <Typography variant="body2">
                                        {new Date(recording.createdAt).toLocaleDateString()}
                                    </Typography>
                                </Grid>
                                {recording.associatedTask && (
                                    <Grid item xs={12}>
                                        <Typography variant="body2" color="textSecondary">Associated Task</Typography>
                                        <Typography variant="body2">{recording.associatedTask.projectTitle}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Right Column - Comments */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Comments ({recording.comments?.length || 0})
                            </Typography>

                            {/* Add Comment */}
                            <Box mb={2}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    placeholder="Add a comment..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    variant="outlined"
                                    size="small"
                                />
                                <Button
                                    fullWidth
                                    variant="contained"
                                    sx={{ mt: 1 }}
                                    onClick={handleAddComment}
                                    disabled={!comment.trim() || addCommentMutation.isPending}
                                >
                                    Add Comment
                                </Button>
                            </Box>

                            <Divider sx={{ mb: 2 }} />

                            {/* Comments List */}
                            <List>
                                {recording.comments?.map((commentItem, index) => (
                                    <ListItem key={index} alignItems="flex-start" sx={{ px: 0 }}>
                                        <ListItemAvatar>
                                            <Avatar
                                                src={commentItem.user.avatar}
                                                sx={{ width: 32, height: 32 }}
                                            >
                                                {commentItem.user.name?.[0]}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="subtitle2">
                                                        {commentItem.user.name}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {new Date(commentItem.createdAt).toLocaleDateString()}
                                                    </Typography>
                                                </Box>
                                            }
                                            secondary={commentItem.comment}
                                        />
                                    </ListItem>
                                ))}
                                {(!recording.comments || recording.comments.length === 0) && (
                                    <Typography variant="body2" color="textSecondary" textAlign="center">
                                        No comments yet
                                    </Typography>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialog} onClose={() => setDeleteDialog(false)}>
                <DialogTitle>Delete Recording</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete this recording? This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleDelete}
                        color="error"
                        disabled={deleteRecordingMutation.isPending}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialog} onClose={() => setRejectDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reject Recording</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder="Please provide a reason for rejection..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        variant="outlined"
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRejectDialog(false)}>Cancel</Button>
                    <Button
                        onClick={handleReject}
                        color="error"
                        disabled={!rejectReason.trim() || rejectRecordingMutation.isPending}
                    >
                        Reject
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RecordingDetails;