import React, { useRef } from "react";
import style from "./styles.module.scss";
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { Link } from "react-router-dom";
import { RouteNames } from "../../../Constants/route";
import { useFetchVideos, useDeleteVideo } from "./videoApi/addVideo";

export default function Videos({ searchTerm }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: videos, isLoading, isError } = useFetchVideos();
  const { mutate: deleteVideo } = useDeleteVideo();
  const videoRefs = useRef([]);
  const [openDialog, setOpenDialog] = React.useState(false);
  const [videoToDelete, setVideoToDelete] = React.useState(null);
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleDeleteClick = (videoId, event) => {
    event.preventDefault();
    event.stopPropagation();
    setVideoToDelete(videoId);
    setOpenDialog(true);
  };

  const handleConfirmDelete = () => {
    deleteVideo(videoToDelete, {
      onSuccess: () => {
        setSnackbar({
          open: true,
          message: "Video deleted successfully!",
          severity: "success",
        });
      },
      onError: () => {
        setSnackbar({
          open: true,
          message: "Failed to delete video",
          severity: "error",
        });
      },
    });
    setOpenDialog(false);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Skeleton Loading (2 rows)
  if (isLoading) {
    return (
      <Box sx={{ overflow: "hidden", width: "100%" }}>
        <Box sx={{ display: "flex", overflowX: "auto", gap: 2, pb: 2 }}>
          {[...Array(8)].map((_, index) => (
            <Box key={index} sx={{ minWidth: 240, flexShrink: 0 }}>
              <Skeleton variant="rectangular" width={240} height={140} />
              <Box sx={{ pt: 1 }}>
                <Skeleton width="60%" />
                <Skeleton width="40%" />
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  }

  if (isError) {
    return (
      <Typography color="error" sx={{ p: 2 }}>
        Error loading videos. Please try again later.
      </Typography>
    );
  }

  const list = Array.isArray(videos?.data) ? videos.data : [];
  const filtered = list.filter((v) =>
    v.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!filtered.length) {
    return (
      <Typography sx={{ p: 2, textAlign: "center" }}>
        No matching videos found.
      </Typography>
    );
  }

  const handleHover = (ref) => ref?.current?.play();
  const handleOut = (ref) => ref?.current?.pause();

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Delete Video</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this video? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} color="error" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Videos with horizontal scroll */}
      <Box
        sx={{
          display: "flex",
          overflowX: "auto",
          gap: 2,
          pb: 2,
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": {
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.grey[400],
            borderRadius: "4px",
          },
        }}
      >
        {filtered.map((video, idx) => (
          <Box
            key={video._id}
            sx={{
              minWidth: isMobile ? 180 : 240,
              flexShrink: 0,
              position: "relative",
            }}
          >
            <Link
              className={`${style.link} ${style.linkContainer}`}
              to={`/${RouteNames.CLIENT}/${RouteNames.SINGLEVIDEO}/${video._id}`}
            >
              <Card sx={{ height: "100%", boxShadow: "none" }}>
                <CardActionArea
                  onMouseEnter={() => handleHover(videoRefs.current[idx])}
                  onMouseLeave={() => handleOut(videoRefs.current[idx])}
                >
                  <video
                    ref={(el) => (videoRefs.current[idx] = el)}
                    width="100%"
                    height="140"
                    src={video.video}
                    muted
                    controls={false}
                    style={{ objectFit: "cover", borderRadius: "4px" }}
                  />
                </CardActionArea>
                <CardContent sx={{ p: 1 }}>
                  <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                    <IconButton
                      className={style.linkDelete}
                      onClick={(e) => handleDeleteClick(video._id, e)}
                      sx={{
                        backgroundColor: "rgba(0,0,0,0.5)",
                        color: "white",
                        "&:hover": {
                          backgroundColor: "rgba(0,0,0,0.7)",
                        },
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    className={style.textClamp}
                    sx={{ mt: 2 }}
                  >
                    {video.description}
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Box>
        ))}
      </Box>
    </Box>
  );
}