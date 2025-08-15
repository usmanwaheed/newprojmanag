"use client"

import { useState, useRef, useEffect } from "react"
import {
    Box,
    Button,
    TextField,
    Typography,
    Container,
    Paper,
    Stepper,
    Step,
    StepLabel,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    LinearProgress,
    Alert,
    Fade,
    useTheme,
    Autocomplete,
    Card,
    CardContent,
    IconButton,
    Tooltip,
} from "@mui/material"
import {
    Stop as StopIcon,
    Pause as PauseIcon,
    PlayArrow as PlayIcon,
    Upload as UploadIcon,
    Settings as SettingsIcon,
    Videocam as VideocamIcon,
    MicOff as MicOffIcon,
    Mic as MicIcon,
    ScreenShare as ScreenShareIcon,
    StopScreenShare as StopScreenShareIcon,
} from "@mui/icons-material"

const RecordVideo = () => {
    const theme = useTheme()
    const [activeStep, setActiveStep] = useState(0)
    const [isRecording, setIsRecording] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState("")
    const [isScreenShare, setIsScreenShare] = useState(false)
    const [isMuted, setIsMuted] = useState(false)

    // Refs
    const videoRef = useRef(null)
    const mediaRecorderRef = useRef(null)
    const streamRef = useRef(null)
    const recordedChunksRef = useRef([])
    const timerRef = useRef(null)

    // Form states
    const [setupForm, setSetupForm] = useState({
        title: "",
        description: "",
        associatedTask: "",
        videoQuality: "medium",
    })

    const [uploadForm, setUploadForm] = useState({
        finalTitle: "",
        finalDescription: "",
        tags: "",
        screenResolution: "",
    })

    const [currentSession, setCurrentSession] = useState(null)
    const [availableTasks, setAvailableTasks] = useState([])
    const [recordedBlob, setRecordedBlob] = useState(null)

    const steps = ["Setup Recording", "Record Video", "Upload & Finalize"]

    // Mock tasks - replace with actual API call
    useEffect(() => {
        // Fetch available tasks
        setAvailableTasks([
            { _id: "1", projectTitle: "Project Alpha", description: "Main project tasks" },
            { _id: "2", projectTitle: "Project Beta", description: "Secondary project" },
            { _id: "3", projectTitle: "Project Gamma", description: "Research project" },
        ])
    }, [])

    // Timer effect
    useEffect(() => {
        if (isRecording && !isPaused) {
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current)
            }
        }
    }, [isRecording, isPaused])

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }

    const handleSetupSubmit = async () => {
        if (!setupForm.title.trim()) {
            setError("Recording title is required")
            return
        }

        try {
            // Call start recording session API
            const response = await fetch("/api/recordings/start", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
                },
                body: JSON.stringify(setupForm),
            })

            const data = await response.json()

            if (data.success) {
                setCurrentSession(data.data)
                setUploadForm((prev) => ({
                    ...prev,
                    finalTitle: setupForm.title,
                    finalDescription: setupForm.description,
                }))
                setActiveStep(1)
                setError("")
            } else {
                setError(data.message || "Failed to start recording session")
            }
        } catch (err) {
            setError("Failed to start recording session")
        }
    }

    const startRecording = async () => {
        try {
            recordedChunksRef.current = []

            const constraints = {
                video: {
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    frameRate: { ideal: 30 },
                },
                audio: !isMuted,
            }

            let stream

            if (isScreenShare) {
                stream = await navigator.mediaDevices.getDisplayMedia(constraints)
            } else {
                stream = await navigator.mediaDevices.getUserMedia(constraints)
            }

            streamRef.current = stream

            if (videoRef.current) {
                videoRef.current.srcObject = stream
            }

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: "video/webm;codecs=vp9",
            })

            mediaRecorderRef.current = mediaRecorder

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, {
                    type: "video/webm",
                })
                setRecordedBlob(blob)

                // Get screen resolution
                setUploadForm((prev) => ({
                    ...prev,
                    screenResolution: `${screen.width}x${screen.height}`,
                }))
            }

            mediaRecorder.start(1000) // Collect data every second
            setIsRecording(true)
            setRecordingTime(0)
            setError("")
        } catch (err) {
            setError("Failed to start recording. Please check camera/microphone permissions.")
        }
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop()
            setIsRecording(false)
            setIsPaused(false)

            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop())
            }

            setActiveStep(2)
        }
    }

    const pauseRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            if (isPaused) {
                mediaRecorderRef.current.resume()
                setIsPaused(false)
            } else {
                mediaRecorderRef.current.pause()
                setIsPaused(true)
            }
        }
    }

    const toggleScreenShare = async () => {
        if (isRecording) {
            setError("Cannot change recording mode while recording")
            return
        }
        setIsScreenShare(!isScreenShare)
    }

    const toggleMute = () => {
        if (isRecording) {
            setError("Cannot change audio settings while recording")
            return
        }
        setIsMuted(!isMuted)
    }

    const handleUpload = async () => {
        if (!recordedBlob || !currentSession) {
            setError("No recording to upload")
            return
        }

        setIsUploading(true)
        setUploadProgress(0)

        try {
            const formData = new FormData()
            formData.append("video", recordedBlob, "recording.webm")
            formData.append("videoDuration", recordingTime.toString())
            formData.append("screenResolution", uploadForm.screenResolution)
            formData.append("tags", uploadForm.tags)
            formData.append("finalTitle", uploadForm.finalTitle)
            formData.append("finalDescription", uploadForm.finalDescription)

            const xhr = new XMLHttpRequest()

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100
                    setUploadProgress(progress)
                }
            }

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText)
                    if (response.success) {
                        setSuccess("Recording uploaded successfully!")
                        setIsUploading(false)
                        // Reset form or redirect
                    } else {
                        setError(response.message || "Upload failed")
                        setIsUploading(false)
                    }
                } else {
                    setError("Upload failed")
                    setIsUploading(false)
                }
            }

            xhr.onerror = () => {
                setError("Upload failed")
                setIsUploading(false)
            }

            xhr.open("POST", `/api/recordings/upload/${currentSession.sessionId}`)
            xhr.setRequestHeader("Authorization", `Bearer ${localStorage.getItem("accessToken")}`)
            xhr.send(formData)
        } catch (err) {
            setError("Upload failed")
            setIsUploading(false)
        }
    }

    const renderSetupStep = () => (
        <Card elevation={3} sx={{ maxWidth: 600, mx: "auto" }}>
            <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: "primary.main", fontWeight: 600 }}>
                    Setup Recording
                </Typography>

                <Stack spacing={3} sx={{ mt: 3 }}>
                    <TextField
                        fullWidth
                        label="Recording Title"
                        value={setupForm.title}
                        onChange={(e) => setSetupForm((prev) => ({ ...prev, title: e.target.value }))}
                        required
                        variant="outlined"
                    />

                    <TextField
                        fullWidth
                        label="Description"
                        value={setupForm.description}
                        onChange={(e) => setSetupForm((prev) => ({ ...prev, description: e.target.value }))}
                        multiline
                        rows={3}
                        variant="outlined"
                    />

                    <Autocomplete
                        options={availableTasks}
                        getOptionLabel={(option) => option.projectTitle}
                        value={availableTasks.find((task) => task._id === setupForm.associatedTask) || null}
                        onChange={(_, value) => setSetupForm((prev) => ({ ...prev, associatedTask: value?._id || "" }))}
                        renderInput={(params) => <TextField {...params} label="Associated Task (Optional)" variant="outlined" />}
                    />

                    <FormControl fullWidth>
                        <InputLabel>Video Quality</InputLabel>
                        <Select
                            value={setupForm.videoQuality}
                            onChange={(e) => setSetupForm((prev) => ({ ...prev, videoQuality: e.target.value }))}
                            label="Video Quality"
                        >
                            <MenuItem value="low">Low (480p)</MenuItem>
                            <MenuItem value="medium">Medium (720p)</MenuItem>
                            <MenuItem value="high">High (1080p)</MenuItem>
                        </Select>
                    </FormControl>

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleSetupSubmit}
                        startIcon={<SettingsIcon />}
                        sx={{ mt: 2 }}
                    >
                        Start Recording Session
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    )

    const renderRecordingStep = () => (
        <Card elevation={3} sx={{ maxWidth: 800, mx: "auto" }}>
            <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: "primary.main", fontWeight: 600 }}>
                    Record Video
                </Typography>

                <Box sx={{ position: "relative", mb: 3 }}>
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        style={{
                            width: "100%",
                            maxHeight: "400px",
                            backgroundColor: "#000",
                            borderRadius: "8px",
                        }}
                    />

                    {isRecording && (
                        <Box
                            sx={{
                                position: "absolute",
                                top: 16,
                                right: 16,
                                backgroundColor: "rgba(0,0,0,0.7)",
                                color: "white",
                                px: 2,
                                py: 1,
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                            }}
                        >
                            <Box
                                sx={{
                                    width: 8,
                                    height: 8,
                                    backgroundColor: "red",
                                    borderRadius: "50%",
                                    animation: "blink 1s infinite",
                                }}
                            />
                            <Typography variant="body2">{formatTime(recordingTime)}</Typography>
                        </Box>
                    )}
                </Box>

                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 3 }}>
                    <Tooltip title={isScreenShare ? "Switch to Camera" : "Switch to Screen Share"}>
                        <IconButton
                            onClick={toggleScreenShare}
                            disabled={isRecording}
                            color={isScreenShare ? "primary" : "default"}
                            size="large"
                        >
                            {isScreenShare ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                        </IconButton>
                    </Tooltip>

                    <Tooltip title={isMuted ? "Unmute" : "Mute"}>
                        <IconButton onClick={toggleMute} disabled={isRecording} color={isMuted ? "error" : "default"} size="large">
                            {isMuted ? <MicOffIcon /> : <MicIcon />}
                        </IconButton>
                    </Tooltip>
                </Stack>

                <Stack direction="row" spacing={2} justifyContent="center">
                    {!isRecording ? (
                        <Button
                            variant="contained"
                            size="large"
                            onClick={startRecording}
                            startIcon={<VideocamIcon />}
                            color="primary"
                        >
                            Start Recording
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outlined"
                                size="large"
                                onClick={pauseRecording}
                                startIcon={isPaused ? <PlayIcon /> : <PauseIcon />}
                            >
                                {isPaused ? "Resume" : "Pause"}
                            </Button>
                            <Button variant="contained" size="large" onClick={stopRecording} startIcon={<StopIcon />} color="error">
                                Stop Recording
                            </Button>
                        </>
                    )}
                </Stack>
            </CardContent>
        </Card>
    )

    const renderUploadStep = () => (
        <Card elevation={3} sx={{ maxWidth: 600, mx: "auto" }}>
            <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ color: "primary.main", fontWeight: 600 }}>
                    Upload & Finalize
                </Typography>

                <Stack spacing={3} sx={{ mt: 3 }}>
                    <TextField
                        fullWidth
                        label="Final Title"
                        value={uploadForm.finalTitle}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, finalTitle: e.target.value }))}
                        variant="outlined"
                    />

                    <TextField
                        fullWidth
                        label="Final Description"
                        value={uploadForm.finalDescription}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, finalDescription: e.target.value }))}
                        multiline
                        rows={3}
                        variant="outlined"
                    />

                    <TextField
                        fullWidth
                        label="Tags (comma separated)"
                        value={uploadForm.tags}
                        onChange={(e) => setUploadForm((prev) => ({ ...prev, tags: e.target.value }))}
                        placeholder="tutorial, demo, presentation"
                        variant="outlined"
                    />

                    <Box sx={{ p: 2, backgroundColor: "background.subtle", borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            Recording Duration: {formatTime(recordingTime)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Screen Resolution: {uploadForm.screenResolution}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            File Size: {recordedBlob ? (recordedBlob.size / (1024 * 1024)).toFixed(2) + " MB" : "N/A"}
                        </Typography>
                    </Box>

                    {isUploading && (
                        <Box>
                            <Typography variant="body2" sx={{ mb: 1 }}>
                                Uploading... {Math.round(uploadProgress)}%
                            </Typography>
                            <LinearProgress variant="determinate" value={uploadProgress} />
                        </Box>
                    )}

                    <Button
                        variant="contained"
                        size="large"
                        onClick={handleUpload}
                        disabled={isUploading}
                        startIcon={<UploadIcon />}
                        sx={{ mt: 2 }}
                    >
                        {isUploading ? "Uploading..." : "Upload Recording"}
                    </Button>
                </Stack>
            </CardContent>
        </Card>
    )

    return (
        <Box
            sx={{
                minHeight: "100vh",
                background:
                    theme.palette.mode === "light"
                        ? "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)"
                        : "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
                py: 4,
            }}
        >
            <Container maxWidth="lg">
                <Fade in={true} timeout={800}>
                    <Box>
                        <Typography
                            variant="h4"
                            align="center"
                            sx={{
                                mb: 4,
                                fontWeight: 700,
                                color: theme.palette.mode === "light" ? "neutral.dark" : "neutral.light",
                            }}
                        >
                            Video Recorder
                        </Typography>

                        <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: "background.paper" }}>
                            <Stepper activeStep={activeStep} alternativeLabel>
                                {steps.map((label) => (
                                    <Step key={label}>
                                        <StepLabel>{label}</StepLabel>
                                    </Step>
                                ))}
                            </Stepper>
                        </Paper>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
                                {error}
                            </Alert>
                        )}

                        {success && (
                            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess("")}>
                                {success}
                            </Alert>
                        )}

                        {activeStep === 0 && renderSetupStep()}
                        {activeStep === 1 && renderRecordingStep()}
                        {activeStep === 2 && renderUploadStep()}
                    </Box>
                </Fade>
            </Container>

            <style jsx>{`
                @keyframes blink {
                    0%, 50% { opacity: 1; }
                    51%, 100% { opacity: 0; }
                }
            `}</style>
        </Box>
    )
}

export default RecordVideo;