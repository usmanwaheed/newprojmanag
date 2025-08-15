import {
    Container,
    Typography,
    Box,
    IconButton,
    Stack,
    Skeleton,
    Chip,
    Divider,
    Tooltip
} from "@mui/material";
import { Link, useParams } from "react-router-dom";
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useQuery } from '@tanstack/react-query';
import {
    CheckCircle,
    Pending,
    Cancel,
    AccessTime,
    Videocam,
    Info
} from "@mui/icons-material";
import { useGetRecordingById } from "./Record2/RecordingService";
import { usegetSingleVideo } from "./videoApi/addVideo";

const SingleVideo = () => {
    const { id } = useParams();

    // Try the recording API first
    const recordingQuery = useGetRecordingById(id);
    const videoQuery = usegetSingleVideo(id);

    // Determine which data to use
    const isRecording = recordingQuery.data?.data;
    const data = isRecording ? recordingQuery.data?.data : videoQuery.data?.data;
    const isLoading = isRecording ? recordingQuery.isLoading : videoQuery.isLoading;
    const isError = isRecording ? recordingQuery.isError : videoQuery.isError;

    const getStatusIcon = (status) => {
        switch (status) {
            case 'approved':
                return <CheckCircle color="success" />;
            case 'pending':
                return <Pending color="warning" />;
            case 'rejected':
                return <Cancel color="error" />;
            default:
                return <Info color="info" />;
        }
    };

    if (isLoading) {
        return (
            <Stack>
                <Container sx={{ mt: 4, mb: 4 }}>
                    <Link to={'/client'}>
                        <IconButton>
                            <ArrowBackIcon />
                        </IconButton>
                    </Link>

                    <Skeleton variant="text" width="90%" height={90} />
                    <Skeleton variant="rectangular" height={400} />
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="85%" />
                    <Skeleton variant="text" width="80%" />
                </Container>
            </Stack>
        );
    }

    if (isError) {
        return (
            <Stack>
                <Container sx={{ mt: 4, mb: 4 }}>
                    <Link to={'/client'}>
                        <IconButton>
                            <ArrowBackIcon />
                        </IconButton>
                    </Link>
                    <Typography color="error">Error loading video details</Typography>
                </Container>
            </Stack>
        );
    }

    return (
        <Stack>
            <Container sx={{ mt: 4, mb: 4 }}>
                <Link to={'/client'}>
                    <IconButton>
                        <ArrowBackIcon />
                    </IconButton>
                </Link>

                {/* Video Title and Status - only shown for recordings */}
                {isRecording && (
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                            {data.title}
                        </Typography>
                        <Chip
                            label={data.approvalStatus}
                            icon={getStatusIcon(data.approvalStatus)}
                            variant="outlined"
                            sx={{ textTransform: 'capitalize' }}
                        />
                    </Box>
                )}

                {/* Video Player - works for both */}
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        mb: 4,
                        borderRadius: 2,
                        overflow: "hidden",
                        boxShadow: 3,
                    }}
                >
                    <video
                        controls
                        autoPlay
                        style={{
                            width: "100%",
                            height: "auto",
                            maxHeight: "70vh",
                            borderRadius: "8px",
                        }}
                        poster={isRecording ? data.thumbnailUrl : undefined}
                        key={isRecording ? data.videoUrl : data.video}
                    >
                        <source
                            src={isRecording ? data.videoUrl : data.video}
                            type={`video/${isRecording ? (data.videoFormat || 'webm') : 'mp4'}`}
                        />
                        Your browser does not support the video tag.
                    </video>
                </Box>

                {/* Metadata - only shown for recordings */}
                {isRecording && (
                    <>
                        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
                            <Tooltip title="Duration">
                                <Chip
                                    icon={<AccessTime />}
                                    label={data.durationFormatted || `${data.videoDuration}s`}
                                    variant="outlined"
                                />
                            </Tooltip>
                            <Tooltip title="Resolution">
                                <Chip
                                    icon={<Videocam />}
                                    label={data.screenResolution}
                                    variant="outlined"
                                />
                            </Tooltip>
                            <Tooltip title="File Size">
                                <Chip
                                    label={data.fileSizeFormatted || `${(data.videoSize / 1024).toFixed(2)} KB`}
                                    variant="outlined"
                                />
                            </Tooltip>
                            <Tooltip title="Created At">
                                <Chip
                                    label={new Date(data.createdAt).toLocaleString()}
                                    variant="outlined"
                                />
                            </Tooltip>
                        </Box>

                        <Divider sx={{ my: 3 }} />
                    </>
                )}

                {/* Description Section - works for both */}
                <Box mb={4}>
                    <Typography
                        variant="h5"
                        gutterBottom
                        sx={{ fontWeight: "bold", mb: 2 }}
                    >
                        {isRecording ? "Description" : "Video Description"}
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{ textAlign: "justify", lineHeight: 1.8 }}
                    >
                        {data.description || "No description provided"}
                    </Typography>
                </Box>

                {/* Tags Section - only shown for recordings */}
                {isRecording && data.tags?.length > 0 && (
                    <Box mb={4}>
                        <Typography
                            variant="h5"
                            gutterBottom
                            sx={{ fontWeight: "bold", mb: 2 }}
                        >
                            Tags
                        </Typography>
                        <Box display="flex" gap={1} flexWrap="wrap">
                            {data.tags.map((tag, index) => (
                                <Chip key={index} label={tag} />
                            ))}
                        </Box>
                    </Box>
                )}
            </Container>
        </Stack>
    );
};

export default SingleVideo;