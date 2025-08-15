import { useState } from 'react';
import { useCreateTask } from '../../hooks/useTask';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Stack
} from '@mui/material';

const TextDialog = ({ open, handleClose }) => {
    const [formData, setFormData] = useState({
        projectTitle: '',
        teamLeadName: '',
        description: '',
        dueDate: '',
        budget: '',
        link: ''
    });

    const { mutate: createTask, isLoading } = useCreateTask();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        createTask(formData, {
            onSuccess: () => {
                setFormData({
                    projectTitle: '',
                    teamLeadName: '',
                    description: '',
                    dueDate: '',
                    budget: '',
                    link: ''
                });
                handleClose();
            }
        });
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <DialogTitle>Add New Project</DialogTitle>

            <DialogContent>
                <Stack spacing={3} sx={{ pt: 2 }}>
                    <TextField
                        name="projectTitle"
                        label="Project Title"
                        value={formData.projectTitle}
                        onChange={handleChange}
                        fullWidth
                        required
                    />

                    <TextField
                        name="teamLeadName"
                        label="Team Leads (comma separated)"
                        value={formData.teamLeadName}
                        onChange={handleChange}
                        fullWidth
                        required
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
                        name="dueDate"
                        label="Due Date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={formData.dueDate}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        name="budget"
                        label="Budget"
                        type="number"
                        value={formData.budget}
                        onChange={handleChange}
                        fullWidth
                    />

                    <TextField
                        name="link"
                        label="Project Link"
                        value={formData.link}
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
                    {isLoading ? 'Creating...' : 'Create Project'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default TextDialog;