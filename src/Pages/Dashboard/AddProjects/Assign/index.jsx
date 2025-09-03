/* eslint-disable no-undef */
import style from './style.module.scss';
import { createSubTask } from '../../../../api/userSubTask';
import { toast } from 'react-toastify';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../../context/AuthProvider';
import { useParams } from 'react-router-dom';
import { Grid, TextField, Button, Box } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function Index() {
    const { id } = useParams(); // <-- projectId from URL
    const queryClient = useQueryClient();

    // Example: get logged in user
    const { user } = useAuth();
    // const user = JSON.parse(localStorage.getItem("user")); // adjust based on your app
    const assignedBy = user?._id || ""; // logged-in userId

    const [formData, setFormData] = useState({
        assign: '',
        title: '',
        description: '',
        dueDate: '',
        projectId: id || '',
        assignedBy: assignedBy,   // <-- add assignedBy
    });

    useEffect(() => {
        if (id) {
            setFormData((prev) => ({ ...prev, projectId: id }));
        }
    }, [id]);

    useEffect(() => {
        if (assignedBy) {
            setFormData((prev) => ({ ...prev, assignedBy })); // update when user available
        }
    }, [assignedBy]);

    const mutation = useMutation({
        mutationFn: createSubTask,
        onSuccess: () => {
            queryClient.invalidateQueries(['userSubtask']);
            setFormData({
                assign: '',
                title: '',
                description: '',
                dueDate: '',
                projectId: id || '',
                assignedBy: assignedBy,  // keep assignedBy after reset
            });
            toast.success("The Sub Task assigned Successfully", {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                progress: false,
            });
        },
        onError: (error) => {
            toast.error(error?.response?.data?.message, {
                position: "top-center",
                autoClose: 4000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: false,
                draggable: true,
                progress: false,
            });
        },
    });

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        mutation.mutate(formData); // <-- projectId + assignedBy included
    };

    return (
        <form style={{ marginTop: '20px' }} onSubmit={handleSubmit}>
            <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                    <TextField
                        variant="outlined"
                        label="User Names (Comma-separated)"
                        name="assign"
                        margin="dense"
                        size="small"
                        fullWidth
                        value={formData.assign}
                        onChange={handleChange}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        variant="outlined"
                        label="Task Title"
                        name="title"
                        margin="dense"
                        size="small"
                        fullWidth
                        value={formData.title}
                        onChange={handleChange}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        variant="outlined"
                        label="Task Description"
                        name="description"
                        margin="dense"
                        size="small"
                        fullWidth
                        multiline
                        rows={4}
                        value={formData.description}
                        onChange={handleChange}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        variant="outlined"
                        label="Due Date"
                        name="dueDate"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        margin="dense"
                        size="small"
                        fullWidth
                        value={formData.dueDate}
                        onChange={handleChange}
                    />
                </Grid>

                <Grid item xs={12}>
                    <Box display="flex" gap={2}>
                        <Button
                            className={`accept ${style.addBtn}`}
                            size="medium"
                            variant="outlined"
                            type="submit"
                        >
                            Create Assign
                        </Button>
                    </Box>
                </Grid>
            </Grid>
        </form>
    );
}
