import { useState, useEffect } from 'react';
import { useUpdateTask } from '../../hooks/useTask';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Stack
} from '@mui/material';

const EditTextDialog = ({ open, handleClose, task }) => {
    const [formData, setFormData] = useState({
        projectTitle: '',
        teamLeadName: '',
        description: '',
        projectStatus: '',
        points: ''
    });

    useEffect(() => {
        if (task) {
            setFormData({
                projectTitle: task.projectTitle || '',
                teamLeadName: Array.isArray(task.teamLeadName)
                    ? task.teamLeadName.join(', ')
                    : task.teamLeadName || '',
                description: task.description || '',
                projectStatus: task.projectStatus || '',
                points: task.points || ''
            });
        }
    }, [task]);

    const { mutate: updateTask, isLoading } = useUpdateTask();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        updateTask({
            taskId: task._id,
            updateData: {
                ...formData,
                teamLeadName: formData.teamLeadName.split(',').map(name => name.trim())
            }
        }, {
            onSuccess: () => handleClose()
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Edit Project</DialogTitle>

            <DialogContent>
                <Stack spacing={3} sx={{ pt: 2 }}>
                    <TextField
                        name="projectTitle"
                        label="Project Title"
                        value={formData.projectTitle}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        name="teamLeadName"
                        label="Team Leads (comma separated)"
                        value={formData.teamLeadName}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        name="description"
                        label="Description"
                        value={formData.description}
                        onChange={handleChange}
                        multiline
                        rows={4}
                        fullWidth
                    />

                    <TextField
                        name="projectStatus"
                        label="Status"
                        value={formData.projectStatus}
                        onChange={handleChange}
                        fullWidth
                        select
                        SelectProps={{ native: true }}
                    >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="not approved">Rejected</option>
                    </TextField>

                    <TextField
                        name="points"
                        label="Points"
                        type="number"
                        value={formData.points}
                        onChange={handleChange}
                        fullWidth
                    />
                </Stack>
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={isLoading}
                >
                    {isLoading ? 'Updating...' : 'Update Project'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default EditTextDialog;