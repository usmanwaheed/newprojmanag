import React, { useRef, useState, useEffect } from "react";
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
    Chip,
    Menu,
    MenuItem,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Tabs,
    Tab,
    Badge,
} from "@mui/material";
import {
    DeleteOutline,
    Edit,
    MoreVert,
    CheckCircle,
    Cancel,
    Pending,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { RouteNames } from "../../../Constants/route";
import { useAuth } from "../../../context/AuthProvider";
import {
    useGetUserRecordings,
    useGetCompanyRecordings,
    useDeleteRecording,
    useUpdateRecording,
    useApproveRecording,
    useRejectRecording
} from "./Record2/RecordingService";

export default function Recordings({ searchTerm }) {
    const { user } = useAuth();
    const role = user?.role;
    const isBasicUser = role === "user";

    // tab index: when full UI -> 0=pending,1=approved; when basic -> forced approved
    const [tabValue, setTabValue] = useState(isBasicUser ? 1 : 0);
    useEffect(() => {
        if (isBasicUser) setTabValue(1);
    }, [isBasicUser]);

    const [anchorEl, setAnchorEl] = useState(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [selectedRecording, setSelectedRecording] = useState(null);
    const [editDescription, setEditDescription] = useState("");
    const videoRefs = useRef([]);

    // Queries
    const {
        data: pendingUserRecordings,
        isLoading: pendingUserLoading,
        error: pendingUserError
    } = useGetUserRecordings({ approvalStatus: "pending" });

    const {
        data: approvedUserRecordings,
        isLoading: approvedUserLoading,
        error: approvedUserError
    } = useGetUserRecordings({ approvalStatus: "approved" });

    const {
        data: pendingCompanyRecordings,
        isLoading: pendingCompanyLoading,
        error: pendingCompanyError
    } = useGetCompanyRecordings({ approvalStatus: "pending" });

    const {
        data: approvedCompanyRecordings,
        isLoading: approvedCompanyLoading,
        error: approvedCompanyError
    } = useGetCompanyRecordings({ approvalStatus: "approved" });
    // Mutations
    const deleteMutation = useDeleteRecording();
    const updateMutation = useUpdateRecording();
    const approveMutation = useApproveRecording();
    const rejectMutation = useRejectRecording();

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleMenuOpen = (event, recording) => {
        setAnchorEl(event.currentTarget);
        setSelectedRecording(recording);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleDeleteClick = () => {
        setOpenDeleteDialog(true);
        handleMenuClose();
    };

    const handleEditClick = () => {
        setEditDescription(selectedRecording.description);
        setOpenEditDialog(true);
        handleMenuClose();
    };

    const handleDeleteConfirm = () => {
        deleteMutation.mutate(selectedRecording._id, {
            onSuccess: () => {
                toast.success("Recording deleted successfully");
                setOpenDeleteDialog(false);
                setSelectedRecording(null);
            },
            onError: (error) => {
                toast.error(error.response?.data?.message || "video cannot be deleted video");
            }
        });
    };

    const handleEditSave = () => {
        updateMutation.mutate({
            id: selectedRecording._id,
            data: { description: editDescription }
        }, {
            onSuccess: () => {
                toast.success("Recording updated successfully");
                setOpenEditDialog(false);
                setSelectedRecording(null);
            },
            onError: () => {
                toast.error("Failed to update recording");
            }
        });
    };

    const handleApprove = () => {
        approveMutation.mutate(selectedRecording._id, {
            onSuccess: () => {
                toast.success("Recording approved");
                handleMenuClose();
                setSelectedRecording(null);
            },
            onError: () => {
                toast.error("Failed to approve recording");
            }
        });
    };

    const handleReject = () => {
        const reason = prompt("Please enter reason for rejection:");
        if (reason) {
            rejectMutation.mutate({
                id: selectedRecording._id,
                reason
            }, {
                onSuccess: () => {
                    toast.success("Recording rejected");
                    handleMenuClose();
                    setSelectedRecording(null);
                },
                onError: () => {
                    toast.error("Failed to reject recording");
                }
            });
        }
    };

    const handleHover = (ref) => ref?.current?.play();
    const handleOut = (ref) => ref?.current?.pause();

    // Permissions
    const canEditDelete = (recording) => {
        if (isBasicUser) return false;
        return (
            role === "qcadmin" ||
            role === "company" ||
            recording?.recordedBy?._id === user?._id ||
            recording?.createdBy === user?._id
        );
    };

    const canApproveReject = (recording) => {
        if (isBasicUser) return false;
        return (
            (role === "qcadmin" || role === "company") &&
            recording?.approvalStatus === "pending" &&
            recording?.recordedBy?._id !== user?._id // Can't approve own recordings
        );
    };

    // Data selector
    const getCurrentData = () => {
        if (isBasicUser) {
            const approvedUserRecs = approvedUserRecordings?.data?.recordings || [];
            const approvedCompanyRecs = approvedCompanyRecordings?.data?.recordings || [];
            const combinedApproved = [...approvedUserRecs, ...approvedCompanyRecs];

            return {
                data: combinedApproved,
                pendingCount: 0,
                isLoading: approvedUserLoading || approvedCompanyLoading,
                error: approvedUserError || approvedCompanyError
            };
        }

        switch (tabValue) {
            case 0: { // Pending
                const pendingUserRecs = pendingUserRecordings?.data?.recordings || [];
                const pendingCompanyRecs =
                    role === "company" || role === "qcadmin"
                        ? pendingCompanyRecordings?.data?.recordings || []
                        : [];
                const combinedPending = [...pendingUserRecs, ...pendingCompanyRecs];
                const uniquePending = combinedPending.filter(
                    (recording, index, self) =>
                        index === self.findIndex(r => r._id === recording._id)
                );
                return {
                    data: uniquePending,
                    pendingCount: uniquePending.length,
                    isLoading: pendingUserLoading || pendingCompanyLoading,
                    error: pendingUserError || pendingCompanyError
                };
            }

            case 1: { // Approved
                const approvedUserRecs = approvedUserRecordings?.data?.recordings || [];
                const approvedCompanyRecs =
                    role === "company" || role === "qcadmin"
                        ? approvedCompanyRecordings?.data?.recordings || []
                        : [];
                const combinedApproved = [...approvedUserRecs, ...approvedCompanyRecs];
                const uniqueApproved = combinedApproved.filter(
                    (recording, index, self) =>
                        index === self.findIndex(r => r._id === recording._id)
                );
                return {
                    data: uniqueApproved,
                    pendingCount: 0,
                    isLoading: approvedUserLoading || approvedCompanyLoading,
                    error: approvedUserError || approvedCompanyError
                };
            }

            default:
                return { data: [], pendingCount: 0, isLoading: false, error: null };
        }
    };

    const { data, pendingCount, isLoading, error } = getCurrentData();

    // Pending count (for badges when not basic user)
    const totalPendingCount = isBasicUser
        ? 0
        : (pendingUserRecordings?.data?.recordings?.length || 0) +
        (pendingCompanyRecordings?.data?.recordings?.length || 0);

    if (isLoading) {
        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    {isBasicUser ? (
                        <Tabs value={0} onChange={() => { }}>
                            <Tab label="Approved Recordings" />
                        </Tabs>
                    ) : (
                        <Tabs value={tabValue} onChange={handleTabChange}>
                            <Tab
                                label={
                                    <Badge badgeContent={tabValue === 0 ? totalPendingCount : 0} color="warning">
                                        Pending Approval
                                    </Badge>
                                }
                            />
                            <Tab label="Approved Recordings" />
                        </Tabs>
                    )}
                </Box>
                <Skeleton variant="text" width="90%" height={90} />
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((item) => (
                        <Grid item xs={12} sm={6} md={3} key={item}>
                            <Skeleton variant="rectangular" height={200} />
                            <Skeleton variant="text" />
                            <Skeleton variant="text" width="60%" />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    if (error) {
        return (
            <Typography color="error" sx={{ p: 2 }}>
                Error loading recordings: {error.message}
            </Typography>
        );
    }

    // Search filter
    const filtered = searchTerm
        ? (data || []).filter((recording) => {
            const description = recording?.description || "";
            const title = recording?.title || "";
            const tags = recording?.tags || [];
            const searchLower = searchTerm.toLowerCase();
            return (
                (typeof description === "string" && description.toLowerCase().includes(searchLower)) ||
                (typeof title === "string" && title.toLowerCase().includes(searchLower)) ||
                tags.some(tag => typeof tag === "string" && tag.toLowerCase().includes(searchLower))
            );
        })
        : data;
    if (!filtered.length) {
        const noDataMessage = isBasicUser
            ? "No approved recordings found"
            : tabValue === 0
                ? "No pending recordings found"
                : "No approved recordings found";

        return (
            <Box sx={{ p: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                    {isBasicUser ? (
                        <Tabs value={0} onChange={() => { }}>
                            <Tab label="Approved Recordings" />
                        </Tabs>
                    ) : (
                        <Tabs value={tabValue} onChange={handleTabChange}>
                            <Tab
                                label={
                                    <Badge badgeContent={tabValue === 0 ? totalPendingCount : 0} color="warning">
                                        Pending Approval
                                    </Badge>
                                }
                            />
                            <Tab label="Approved Recordings" />
                        </Tabs>
                    )}
                </Box>
                <Typography sx={{ textAlign: 'center', mt: 4, color: 'text.secondary' }}>
                    {noDataMessage} {searchTerm ? "matching your search" : ""}.
                </Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
                {isBasicUser ? (
                    <Tabs value={0} onChange={() => { }}>
                        <Tab label="Approved Recordings" />
                    </Tabs>
                ) : (
                    <Tabs value={tabValue} onChange={handleTabChange}>
                        <Tab
                            label={
                                <Badge badgeContent={tabValue === 0 ? totalPendingCount : 0} color="warning">
                                    Pending Approval
                                </Badge>
                            }
                        />
                        <Tab label="Approved Recordings" />
                    </Tabs>
                )}
            </Box>

            <Grid container spacing={3}>
                {filtered.map((recording, idx) => {
                    videoRefs.current[idx] = React.createRef();
                    const isPending = recording?.approvalStatus === "pending";
                    const isRejected = recording?.approvalStatus === "rejected";

                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={recording._id}>
                            <Card
                                sx={{
                                    height: "100%",
                                    display: "flex",
                                    flexDirection: "column",
                                    transition: "transform 0.2s",
                                    opacity: isPending ? 0.7 : 1,
                                    "&:hover": {
                                        transform: "scale(1.02)",
                                        boxShadow: 3,
                                        opacity: isPending ? 0.85 : 1,
                                    },
                                }}
                            >
                                <Box sx={{ position: "relative" }}>
                                    <CardActionArea
                                        component={Link}
                                        to={`/${RouteNames.CLIENT}/${RouteNames.SINGLEVIDEO}/${recording._id}`}
                                        onMouseEnter={() => handleHover(videoRefs.current[idx])}
                                        onMouseLeave={() => handleOut(videoRefs.current[idx])}
                                        disabled={isPending}
                                    >
                                        <video
                                            ref={videoRefs.current[idx]}
                                            width="100%"
                                            height="180"
                                            src={recording.videoUrl || recording.video}
                                            muted
                                            controls={false}
                                            style={{ objectFit: "cover" }}
                                            poster={recording.thumbnailUrl || recording.thumbnail}
                                        />
                                        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
                                            <Chip
                                                label={recording.approvalStatus || recording.status}
                                                size="small"
                                                color={
                                                    (recording.approvalStatus || recording.status) === "approved"
                                                        ? "success"
                                                        : (recording.approvalStatus || recording.status) === "rejected"
                                                            ? "error"
                                                            : "warning"
                                                }
                                                icon={
                                                    (recording.approvalStatus || recording.status) === "approved" ? (
                                                        <CheckCircle fontSize="small" />
                                                    ) : (recording.approvalStatus || recording.status) === "rejected" ? (
                                                        <Cancel fontSize="small" />
                                                    ) : (
                                                        <Pending fontSize="small" />
                                                    )
                                                }
                                            />
                                        </Box>
                                        {isPending && (
                                            <Box
                                                sx={{
                                                    position: "absolute",
                                                    top: "50%",
                                                    left: "50%",
                                                    transform: "translate(-50%, -50%)",
                                                    bgcolor: "rgba(0,0,0,0.7)",
                                                    color: "white",
                                                    px: 2,
                                                    py: 1,
                                                    borderRadius: 1,
                                                    fontSize: "0.875rem",
                                                }}
                                            >
                                                Waiting for Approval
                                            </Box>
                                        )}
                                    </CardActionArea>
                                </Box>

                                <CardContent sx={{ flexGrow: 1, p: 2 }}>
                                    <Box
                                        sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "flex-start",
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            component="h3"
                                            sx={{
                                                mb: 1,
                                                fontWeight: "medium",
                                                flexGrow: 1,
                                                pr: 1,
                                            }}
                                            className={style.textClamp}
                                        >
                                            {recording.title || recording.description}
                                        </Typography>

                                        {!isBasicUser && (canEditDelete(recording) || canApproveReject(recording)) && (
                                            <IconButton
                                                size="small"
                                                onClick={(e) => handleMenuOpen(e, recording)}
                                            >
                                                <MoreVert fontSize="small" />
                                            </IconButton>
                                        )}
                                    </Box>

                                    {recording.description && recording.title && (
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ mb: 1 }}
                                            className={style.textClamp}
                                        >
                                            {recording.description}
                                        </Typography>
                                    )}

                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mb: 1 }}
                                    >
                                        {new Date(recording.createdAt).toLocaleDateString()}
                                    </Typography>

                                    {recording.recordedBy && (
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            sx={{ mb: 1, display: 'block' }}
                                        >
                                            By: {recording.recordedBy.name}
                                        </Typography>
                                    )}

                                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                        {recording.tags?.map((tag) => (
                                            <Chip
                                                key={tag}
                                                label={tag}
                                                size="small"
                                                variant="outlined"
                                            />
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Action Menus & Dialogs disabled for basic users */}
            {!isBasicUser && (
                <>
                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
                        {canEditDelete(selectedRecording) && (
                            <MenuItem onClick={handleEditClick}>
                                <Edit fontSize="small" sx={{ mr: 1 }} /> Edit
                            </MenuItem>
                        )}
                        {canEditDelete(selectedRecording) && (
                            <MenuItem onClick={handleDeleteClick}>
                                <DeleteOutline fontSize="small" sx={{ mr: 1 }} /> Delete
                            </MenuItem>
                        )}
                        {canApproveReject(selectedRecording) && (
                            <MenuItem onClick={handleApprove}>
                                <CheckCircle fontSize="small" sx={{ mr: 1 }} color="success" /> Approve
                            </MenuItem>
                        )}
                        {canApproveReject(selectedRecording) && (
                            <MenuItem onClick={handleReject}>
                                <Cancel fontSize="small" sx={{ mr: 1 }} color="error" /> Reject
                            </MenuItem>
                        )}
                    </Menu>

                    {/* Delete Confirmation Dialog */}
                    <Dialog
                        open={openDeleteDialog}
                        onClose={() => setOpenDeleteDialog(false)}
                    >
                        <DialogTitle>Delete Recording</DialogTitle>
                        <DialogContent>
                            <Typography>
                                Are you sure you want to delete this recording? This action cannot be undone.
                            </Typography>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                            <Button
                                onClick={handleDeleteConfirm}
                                color="error"
                                variant="contained"
                                disabled={deleteMutation.isLoading}
                            >
                                {deleteMutation.isLoading ? "Deleting..." : "Delete"}
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Edit Dialog */}
                    <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
                        <DialogTitle>Edit Recording</DialogTitle>
                        <DialogContent>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Description"
                                type="text"
                                fullWidth
                                variant="outlined"
                                multiline
                                rows={3}
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                            />
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
                            <Button
                                onClick={handleEditSave}
                                color="primary"
                                variant="contained"
                                disabled={updateMutation.isLoading}
                            >
                                {updateMutation.isLoading ? "Saving..." : "Save"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Box>
    );
}
