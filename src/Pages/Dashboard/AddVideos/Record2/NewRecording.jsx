// 4. NewRecording.jsx - Recording creation page
import React, { useState, useRef, useEffect } from 'react';
import {
    Box, Container, Paper, Typography, TextField, Button, Alert,
    FormControl, InputLabel, Select, MenuItem, Grid, Card, CardContent,
    LinearProgress, Dialog, DialogTitle, DialogContent, DialogActions,
    List, ListItem, ListItemText, Chip, IconButton, Snackbar
} from '@mui/material';
import {
    Videocam, Stop, Pause, PlayArrow, Upload, Close,
    Settings, Mic, MicOff, VolumeUp, VolumeOff, VideocamOff
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useRecording } from './RecordingContext';
import { useAuth } from '../../../../context/AuthProvider';
import {
    useStartRecordingSession,
    useUpdateRecordingStatus,
    useUploadRecording
} from './RecordingService';

const NewRecording = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    // Use the TanStack Query hooks
    const { mutateAsync: startSession } = useStartRecordingSession();
    const { mutateAsync: updateStatus } = useUpdateRecordingStatus();
    const { mutateAsync: uploadRecording, isLoading: isUploading } = useUploadRecording();

    const {
        currentSession, setCurrentSession,
        recordingState, setRecordingState,
        mediaRecorder, setMediaRecorder,
        recordedChunks, setRecordedChunks,
        recordingStartTime, setRecordingStartTime,
        recordingDuration
    } = useRecording();

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        associatedTask: '',
        videoQuality: 'medium'
    });
    const [stream, setStream] = useState(null);
    const [error, setError] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [screenResolution, setScreenResolution] = useState('');
    const [uploadSuccess, setUploadSuccess] = useState(false);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    useEffect(() => {
        // Get screen resolution
        setScreenResolution(`${window.screen.width}x${window.screen.height}`);

        // Cleanup on unmount
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const resetForm = () => {
        setFormData({
            title: '',
            description: '',
            associatedTask: '',
            videoQuality: 'medium'
        });
        setRecordedChunks([]);
        setCurrentSession(null);
        setRecordingState('idle');
        setRecordingStartTime(null);
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const handleInputChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const getMediaStream = async () => {
        try {
            const constraints = {
                video: videoEnabled ? {
                    mediaSource: 'screen',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 }
                } : false,
                audio: audioEnabled ? {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } : false
            };

            const mediaStream = await navigator.mediaDevices.getDisplayMedia(constraints);

            // Add microphone audio if enabled
            if (audioEnabled) {
                try {
                    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const audioTrack = audioStream.getAudioTracks()[0];
                    mediaStream.addTrack(audioTrack);
                } catch (err) {
                    console.warn('Could not access microphone:', err);
                }
            }

            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }

            return mediaStream;
        } catch (err) {
            throw new Error('Failed to access screen: ' + err.message);
        }
    };

    const startRecording = async () => {
        try {
            setError(null);

            if (!formData.title.trim()) {
                setError('Please enter a recording title');
                return;
            }

            const recordingData = {
                ...formData,
                companyId: user?.companyId?._id || user?._id
            };

            // Start recording session using the hook
            const sessionResponse = await startSession(recordingData);
            setCurrentSession(sessionResponse);

            // Get media stream
            const mediaStream = await getMediaStream();

            // Create media recorder
            const options = {
                mimeType: 'video/webm;codecs=vp8,opus',
                videoBitsPerSecond: getVideoBitrate(),
                audioBitsPerSecond: 128000
            };

            const recorder = new MediaRecorder(mediaStream, options);
            const chunks = [];

            recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            recorder.onstop = () => {
                setRecordedChunks(chunks);
            };

            recorder.start(1000); // Collect data every second
            setMediaRecorder(recorder);
            setRecordingState('recording');
            setRecordingStartTime(Date.now());

            // Update backend status
            await updateStatus({
                sessionId: sessionResponse.data.sessionId,
                status: 'recording'
            });

        } catch (err) {
            setError(err.message);
        }
    };

    const getVideoBitrate = () => {
        switch (formData.videoQuality) {
            case 'low': return 500000;
            case 'medium': return 1000000;
            case 'high': return 2000000;
            default: return 1000000;
        }
    };
    const pauseRecording = async () => {
        if (mediaRecorder && recordingState === 'recording') {
            mediaRecorder.pause();
            setRecordingState('paused');
            await updateStatus({
                sessionId: currentSession?.data?.sessionId,
                status: 'paused'
            });
        }
    };

    const resumeRecording = async () => {
        if (mediaRecorder && recordingState === 'paused') {
            mediaRecorder.resume();
            setRecordingState('recording');
            await updateStatus({
                sessionId: currentSession?.data?.sessionId,
                status: 'recording'
            });
        }
    };

    const stopRecording = async () => {
        if (mediaRecorder) {
            mediaRecorder.stop();
            setRecordingState('stopped');

            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            await updateStatus({
                sessionId: currentSession?.data?.sessionId,
                status: 'stopped'
            });
        }
    };

    const handleUploadRecording = async () => {
        if (recordedChunks.length === 0) {
            setError('No recording data available');
            return;
        }

        try {
            setError(null);

            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            const formDataToUpload = new FormData();
            formDataToUpload.append('video', blob, `recording_${currentSession?.data?.sessionId}.webm`);
            formDataToUpload.append('videoDuration', recordingDuration);
            formDataToUpload.append('screenResolution', screenResolution);
            formDataToUpload.append('finalTitle', formData.title);
            formDataToUpload.append('finalDescription', formData.description);

            await uploadRecording({
                sessionId: currentSession?.data?.sessionId,
                formData: formDataToUpload
            });

            // Show success message based on user role
            setUploadSuccess(true);

            // Reset the form and state
            resetForm();

        } catch (err) {
            setError(err.message);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const RecordingPreview = () => (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Recording Preview</Typography>
                    <Chip
                        label={recordingState.toUpperCase()}
                        color={recordingState === 'recording' ? 'error' : 'default'}
                    />
                </Box>

                <Box sx={{ position: 'relative', mb: 2 }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        style={{
                            width: '100%',
                            maxHeight: '400px',
                            backgroundColor: '#000',
                            borderRadius: '8px'
                        }}
                    />

                    {recordingState !== 'idle' && (
                        <Box
                            sx={{
                                position: 'absolute',
                                bottom: 16,
                                left: 16,
                                bgcolor: 'rgba(0,0,0,0.7)',
                                color: 'white',
                                px: 2,
                                py: 1,
                                borderRadius: 1,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    bgcolor: recordingState === 'recording' ? 'red' : 'orange',
                                    animation: recordingState === 'recording' ? 'pulse 1s infinite' : 'none'
                                }}
                            />
                            <Typography variant="body2">
                                {formatTime(recordingDuration)}
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Box display="flex" gap={2} justifyContent="center">
                    {recordingState === 'idle' && (
                        <Button
                            variant="contained"
                            startIcon={<Videocam />}
                            onClick={startRecording}
                            size="large"
                            color="error"
                        >
                            Start Recording
                        </Button>
                    )}

                    {recordingState === 'recording' && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<Pause />}
                                onClick={pauseRecording}
                            >
                                Pause
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<Stop />}
                                onClick={stopRecording}
                                color="error"
                            >
                                Stop
                            </Button>
                        </>
                    )}

                    {recordingState === 'paused' && (
                        <>
                            <Button
                                variant="contained"
                                startIcon={<PlayArrow />}
                                onClick={resumeRecording}
                                color="success"
                            >
                                Resume
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<Stop />}
                                onClick={stopRecording}
                                color="error"
                            >
                                Stop
                            </Button>
                        </>
                    )}

                    {recordingState === 'stopped' && recordedChunks.length > 0 && (
                        <Button
                            variant="contained"
                            startIcon={<Upload />}
                            onClick={handleUploadRecording}
                            disabled={isUploading || !recordedChunks.length}
                        >
                            {isUploading ? 'Uploading...' : 'Upload Recording'}
                        </Button>
                    )}
                </Box>

                {isUploading && (
                    <Box sx={{ mt: 2 }}>
                        <LinearProgress variant="indeterminate" />
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Typography variant="h4" component="h1">
                    New Recording
                </Typography>
                <Box>
                    <IconButton onClick={() => setShowSettings(true)}>
                        <Settings />
                    </IconButton>
                    <Button
                        variant="outlined"
                        onClick={() => navigate('/dashboard')}
                        sx={{ ml: 2 }}
                    >
                        Cancel
                    </Button>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <RecordingPreview />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            Recording Details
                        </Typography>

                        <TextField
                            fullWidth
                            label="Title"
                            name="title"
                            value={formData.title}
                            onChange={handleInputChange}
                            margin="normal"
                            required
                            disabled={recordingState !== 'idle'}
                        />

                        <TextField
                            fullWidth
                            label="Description"
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            margin="normal"
                            multiline
                            rows={3}
                            disabled={recordingState !== 'idle'}
                        />

                        <FormControl fullWidth margin="normal" disabled={recordingState !== 'idle'}>
                            <InputLabel>Video Quality</InputLabel>
                            <Select
                                name="videoQuality"
                                value={formData.videoQuality}
                                onChange={handleInputChange}
                            >
                                <MenuItem value="low">Low (500kbps)</MenuItem>
                                <MenuItem value="medium">Medium (1Mbps)</MenuItem>
                                <MenuItem value="high">High (2Mbps)</MenuItem>
                            </Select>
                        </FormControl>

                        <FormControl fullWidth margin="normal" disabled={recordingState !== 'idle'}>
                            <InputLabel>Associated Task (Optional)</InputLabel>
                            <Select
                                name="associatedTask"
                                value={formData.associatedTask}
                                onChange={handleInputChange}
                            >
                                <MenuItem value="">None</MenuItem>
                                {tasks.map((task) => (
                                    <MenuItem key={task._id} value={task._id}>
                                        {task.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Paper>
                </Grid>
            </Grid>

            {/* Settings Dialog */}
            <Dialog open={showSettings} onClose={() => setShowSettings(false)}>
                <DialogTitle>Recording Settings</DialogTitle>
                <DialogContent>
                    <List>
                        <ListItem>
                            <ListItemText primary="Audio" secondary="Enable/disable microphone" />
                            <IconButton
                                onClick={() => setAudioEnabled(!audioEnabled)}
                                color={audioEnabled ? 'primary' : 'default'}
                            >
                                {audioEnabled ? <Mic /> : <MicOff />}
                            </IconButton>
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Video" secondary="Enable/disable screen capture" />
                            <IconButton
                                onClick={() => setVideoEnabled(!videoEnabled)}
                                color={videoEnabled ? 'primary' : 'default'}
                            >
                                {videoEnabled ? <Videocam /> : <VideocamOff />}
                            </IconButton>
                        </ListItem>
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setShowSettings(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Success Snackbar */}
            <Snackbar
                open={uploadSuccess}
                autoHideDuration={6000}
                onClose={() => setUploadSuccess(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setUploadSuccess(false)}
                    severity="success"
                    sx={{ width: '100%' }}
                >
                    {user?.role === 'QcAdmin' || user?.role === 'user'
                        ? 'Video uploaded and waiting for approval'
                        : 'Video uploaded successfully'}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default NewRecording;