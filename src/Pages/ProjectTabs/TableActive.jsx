import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthProvider';
import { useDeleteTask, useGetCreateTask } from '../../hooks/useTask';
import { RouteNames } from '../../Constants/route';
import {
    Typography, Menu, Table, Button, TableRow,
    MenuItem, TableCell, TableBody, TableHead,
    TableContainer, Stack, IconButton, ListItemIcon,
    Chip
} from '@mui/material';
import {
    MoreVert, Edit, DeleteOutline,
    Add, VisibilityOutlined
} from '@mui/icons-material';
import TextDialog from './TextDialog';
import EditTextDialog from './EditTextDialog';
import style from './style.module.scss';
import { formatDate } from '../../Utils/dateUtil';

export default function TableActive() {
    const { user, theme, mode } = useAuth();
    const navigate = useNavigate();

    const tableClassText = mode === 'light' ? style.lightTableText : style.darkTableText;
    const tableGap = mode === 'light' ? style.tableBodyLight : style.tableBodyDark;

    const [anchor, setAnchor] = useState(null);
    const [selectedTask, setSelectedTask] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const { data, isLoading, error } = useGetCreateTask(user?.companyId?._id || user?._id);
    const { mutate: deleteTask } = useDeleteTask();

    const handleMenuOpen = (event, taskId) => {
        setAnchor(event.currentTarget);
        setSelectedTask(taskId);
    };

    const handleMenuClose = () => setAnchor(null);

    const handleDelete = () => {
        deleteTask(selectedTask, {
            onSuccess: () => handleMenuClose()
        });
    };

    const handleViewTask = (taskId) => {
        handleMenuClose();
        navigate(`${RouteNames.ADDPRODUCTS}/${taskId}`);
    };

    const getStatusColor = (status) => {
        switch (status?.toLowerCase()) {
            case 'approved': return 'success';
            case 'rejected': return 'error';
            case 'pending': return 'warning';
            default: return 'default';
        }
    };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error.message}</div>;

    return (
        <TableContainer>
            {data?.data?.length > 0 ? (
                <Table sx={{
                    backgroundColor: theme.palette.background.paper,
                    color: theme.palette.text.primary,
                    borderRadius: '0.6rem'
                }}>
                    <TableHead>
                        <TableRow className={style.tableRowHead}>
                            <TableCell className={tableClassText}>Project Title</TableCell>
                            <TableCell className={tableClassText}>Owner</TableCell>
                            <TableCell className={tableClassText}>Status</TableCell>
                            <TableCell className={tableClassText}>Team Leads</TableCell>
                            <TableCell className={tableClassText}>Start Date</TableCell>
                            <TableCell className={tableClassText}>Due Date</TableCell>
                            <TableCell className={tableClassText}>Budget</TableCell>
                            <TableCell className={tableClassText}>Points</TableCell>
                            <TableCell className={tableClassText} align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody className={tableGap}>
                        {data.data.map((task) => (
                            <TableRow key={task._id} className={style.tableRowBody}>
                                <TableCell>{task.projectTitle}</TableCell>
                                <TableCell>{task.assignedBy?.name}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={task.projectStatus}
                                        color={getStatusColor(task.projectStatus)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {Array.isArray(task.teamLeadName)
                                        ? task.teamLeadName.join(', ')
                                        : task.teamLeadName}
                                </TableCell>
                                <TableCell>{formatDate(task.startDate)}</TableCell>
                                <TableCell>{formatDate(task.dueDate)}</TableCell>
                                <TableCell>${task.budget?.toLocaleString()}</TableCell>
                                <TableCell>{task.points}</TableCell>
                                <TableCell align="right">
                                    <IconButton onClick={(e) => handleMenuOpen(e, task._id)}>
                                        <MoreVert />
                                    </IconButton>

                                    <Menu
                                        anchorEl={anchor}
                                        open={Boolean(anchor) && selectedTask === task._id}
                                        onClose={handleMenuClose}
                                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    >
                                        <MenuItem onClick={() => handleViewTask(task._id)}>
                                            <ListItemIcon><VisibilityOutlined fontSize="small" /></ListItemIcon>
                                            View
                                        </MenuItem>

                                        {(user?.role === 'company') && (
                                            <MenuItem onClick={() => {
                                                setEditDialogOpen(true);
                                                handleMenuClose();
                                            }}>
                                                <ListItemIcon><Edit fontSize="small" /></ListItemIcon>
                                                Edit
                                            </MenuItem>
                                        )}

                                        {(user?.role === 'company') && (
                                            <MenuItem onClick={handleDelete}>
                                                <ListItemIcon><DeleteOutline fontSize="small" /></ListItemIcon>
                                                Delete
                                            </MenuItem>
                                        )}
                                    </Menu>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <Stack alignItems="center" justifyContent="center" height="50vh" gap={4}>
                    <Typography variant="h6">No active projects yet</Typography>
                    <Stack gap={2} width={350} textAlign="center">
                        <Typography>
                            You haven't started any projects. Begin a new project to see it appear here.
                        </Typography>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setDialogOpen(true)}
                        >
                            Add Project
                        </Button>
                    </Stack>
                </Stack>
            )}

            <TextDialog
                open={dialogOpen}
                handleClose={() => setDialogOpen(false)}
            />

            <EditTextDialog
                open={editDialogOpen}
                handleClose={() => {
                    setEditDialogOpen(false);
                    setSelectedTask(null);
                }}
                task={data?.data?.find(t => t._id === selectedTask)}
            />
        </TableContainer>
    );
}