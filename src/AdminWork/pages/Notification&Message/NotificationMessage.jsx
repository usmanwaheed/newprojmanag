import { useState } from "react";
import {
    Box, Paper, Typography,
    Grid, Card, CardContent,
    CardActions, Button, Switch,
    FormControlLabel, TextField, Dialog,
    DialogTitle, DialogContent, DialogActions,
    Chip, IconButton, Tabs,
    Tab, Table, TableBody,
    TableCell, TableContainer, TableHead,
    TableRow, FormControl, InputLabel,
    Select, MenuItem, useTheme,
    alpha, LinearProgress,
} from "@mui/material";
import {
    Email as EmailIcon,
    Sms as SmsIcon,
    NotificationsActive as NotificationIcon,
    Send as SendIcon,
    Edit as EditIcon,
    Visibility as ViewIcon,
    Settings as SettingsIcon,
    TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import "./Notification&Message.scss";


const NotificationMessage = () => {
    const theme = useTheme();
    const [tabValue, setTabValue] = useState(0);

    const [emailTemplates, setEmailTemplates] = useState([
        {
            id: "1",
            name: "Welcome Email",
            subject: "Welcome to our platform!",
            type: "signup",
            isActive: true,
            openRate: 85.2,
            clickRate: 12.4,
            lastModified: "2024-01-15",
        },
        {
            id: "2",
            name: "Payment Failed",
            subject: "Payment Issue - Action Required",
            type: "payment_failed",
            isActive: true,
            openRate: 92.1,
            clickRate: 45.8,
            lastModified: "2024-01-10",
        },
        {
            id: "3",
            name: "Trial Ending Soon",
            subject: "Your trial expires in 3 days",
            type: "trial_ending",
            isActive: true,
            openRate: 78.9,
            clickRate: 23.6,
            lastModified: "2024-01-08",
        },
    ]);

    const [broadcastMessages, setBroadcastMessages] = useState([
        {
            id: "1",
            title: "New Feature Announcement",
            content: "We've just released our new dashboard with improved analytics...",
            type: "email",
            status: "sent",
            recipients: 1250,
            sentDate: "2024-01-20",
            openRate: 68.4,
            clickRate: 15.2,
        },
        {
            id: "2",
            title: "Maintenance Notice",
            content: "Scheduled maintenance on Sunday from 2-4 AM EST...",
            type: "email",
            status: "scheduled",
            recipients: 2100,
            scheduledDate: "2024-01-25",
        },
        {
            id: "3",
            title: "Holiday Promotion",
            content: "Special discount for the holidays - 30% off all plans!",
            type: "email",
            status: "draft",
            recipients: 0,
        },
    ]);

    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
    const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
    const [selectedBroadcast, setSelectedBroadcast] = useState(null);

    const getStatusColor = (status) => {
        switch (status) {
            case "sent":
                return "success";
            case "scheduled":
                return "warning";
            case "draft":
                return "default";
            default:
                return "default";
        }
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case "email":
                return <EmailIcon />;
            case "sms":
                return <SmsIcon />;
            case "push":
                return <NotificationIcon />;
            default:
                return <EmailIcon />;
        }
    };

    const handleEditTemplate = (template) => {
        setSelectedTemplate(template);
        setTemplateDialogOpen(true);
    };

    const handleCreateBroadcast = () => {
        setSelectedBroadcast({
            id: "",
            title: "",
            content: "",
            type: "email",
            status: "draft",
            recipients: 0,
        });
        setBroadcastDialogOpen(true);
    };

    const handleEditBroadcast = (broadcast) => {
        setSelectedBroadcast(broadcast);
        setBroadcastDialogOpen(true);
    };

    const toggleTemplateStatus = (templateId) => {
        setEmailTemplates((templates) => templates.map((t) => (t.id === templateId ? { ...t, isActive: !t.isActive } : t)));
    };

    const stats = {
        totalEmails: broadcastMessages.filter((m) => m.status === "sent").reduce((sum, m) => sum + m.recipients, 0),
        avgOpenRate: emailTemplates.reduce((sum, t) => sum + t.openRate, 0) / emailTemplates.length,
        avgClickRate: emailTemplates.reduce((sum, t) => sum + t.clickRate, 0) / emailTemplates.length,
        activeTemplates: emailTemplates.filter((t) => t.isActive).length,
    };

    return (
        <Box className="notifications-messaging" sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, color: theme.palette.text.primary }}>
                Notifications & Messaging
            </Typography>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            backgroundColor: alpha(theme.palette.primary.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: theme.palette.primary.main }}>
                                        {stats.totalEmails.toLocaleString()}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Emails Sent
                                    </Typography>
                                </Box>
                                <EmailIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            backgroundColor: alpha("#4caf50", 0.1),
                            border: `1px solid ${alpha("#4caf50", 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: "#4caf50" }}>
                                        {stats.avgOpenRate.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Avg Open Rate
                                    </Typography>
                                </Box>
                                <TrendingUpIcon sx={{ fontSize: 40, color: "#4caf50" }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            backgroundColor: alpha("#ff9800", 0.1),
                            border: `1px solid ${alpha("#ff9800", 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: "#ff9800" }}>
                                        {stats.avgClickRate.toFixed(1)}%
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Avg Click Rate
                                    </Typography>
                                </Box>
                                <NotificationIcon sx={{ fontSize: 40, color: "#ff9800" }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: theme.palette.secondary.main }}>
                                        {stats.activeTemplates}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Active Templates
                                    </Typography>
                                </Box>
                                <SettingsIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content */}
            <Paper sx={{ backgroundColor: theme.palette.background.paper }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                    <Tab label="Email Templates" />
                    <Tab label="Broadcast Messages" />
                    <Tab label="Analytics" />
                    <Tab label="Settings" />
                </Tabs>

                {/* Email Templates Tab */}
                {tabValue === 0 && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <Typography variant="h5">Transactional Email Templates</Typography>
                            <Button
                                variant="contained"
                                startIcon={<EmailIcon />}
                                onClick={() => {
                                    setSelectedTemplate({
                                        id: "",
                                        name: "",
                                        subject: "",
                                        type: "custom",
                                        isActive: true,
                                        openRate: 0,
                                        clickRate: 0,
                                        lastModified: new Date().toISOString().split("T")[0],
                                    });
                                    setTemplateDialogOpen(true);
                                }}
                            >
                                Create Template
                            </Button>
                        </Box>

                        <Grid container spacing={3}>
                            {emailTemplates.map((template) => (
                                <Grid item xs={12} md={6} lg={4} key={template.id}>
                                    <Card>
                                        <CardContent>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start", mb: 2 }}>
                                                <Typography variant="h6">{template.name}</Typography>
                                                <Switch
                                                    checked={template.isActive}
                                                    onChange={() => toggleTemplateStatus(template.id)}
                                                    size="small"
                                                />
                                            </Box>
                                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                                {template.subject}
                                            </Typography>
                                            <Chip
                                                label={template.type.replace("_", " ")}
                                                size="small"
                                                sx={{ mb: 2, textTransform: "capitalize" }}
                                            />
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                <Typography variant="body2">Open Rate</Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {template.openRate}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={template.openRate}
                                                sx={{ mb: 1, height: 6, borderRadius: 3 }}
                                            />
                                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                <Typography variant="body2">Click Rate</Typography>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {template.clickRate}%
                                                </Typography>
                                            </Box>
                                            <LinearProgress
                                                variant="determinate"
                                                value={template.clickRate}
                                                color="secondary"
                                                sx={{ height: 6, borderRadius: 3 }}
                                            />
                                        </CardContent>
                                        <CardActions>
                                            <Button size="small" startIcon={<EditIcon />} onClick={() => handleEditTemplate(template)}>
                                                Edit
                                            </Button>
                                            <Button size="small" startIcon={<ViewIcon />}>
                                                Preview
                                            </Button>
                                        </CardActions>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Broadcast Messages Tab */}
                {tabValue === 1 && (
                    <Box sx={{ p: 3 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
                            <Typography variant="h5">Broadcast Messages</Typography>
                            <Button variant="contained" startIcon={<SendIcon />} onClick={handleCreateBroadcast}>
                                Create Broadcast
                            </Button>
                        </Box>

                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Title</TableCell>
                                        <TableCell>Type</TableCell>
                                        <TableCell>Status</TableCell>
                                        <TableCell>Recipients</TableCell>
                                        <TableCell>Date</TableCell>
                                        <TableCell>Performance</TableCell>
                                        <TableCell>Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {broadcastMessages.map((message) => (
                                        <TableRow key={message.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight="medium">
                                                    {message.title}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {message.content.substring(0, 50)}...
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    {getTypeIcon(message.type)}
                                                    <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                                                        {message.type}
                                                    </Typography>
                                                </Box>
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={message.status}
                                                    color={getStatusColor(message.status)}
                                                    size="small"
                                                    sx={{ textTransform: "capitalize" }}
                                                />
                                            </TableCell>
                                            <TableCell>{message.recipients.toLocaleString()}</TableCell>
                                            <TableCell>
                                                {message.status === "sent" && message.sentDate}
                                                {message.status === "scheduled" && message.scheduledDate}
                                                {message.status === "draft" && "-"}
                                            </TableCell>
                                            <TableCell>
                                                {message.openRate && message.clickRate ? (
                                                    <Box>
                                                        <Typography variant="caption">Open: {message.openRate}%</Typography>
                                                        <br />
                                                        <Typography variant="caption">Click: {message.clickRate}%</Typography>
                                                    </Box>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Box sx={{ display: "flex", gap: 1 }}>
                                                    <IconButton size="small" onClick={() => handleEditBroadcast(message)}>
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton size="small">
                                                        <ViewIcon />
                                                    </IconButton>
                                                    {message.status === "draft" && (
                                                        <IconButton size="small" color="primary">
                                                            <SendIcon />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}

                {/* Analytics Tab */}
                {tabValue === 2 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>
                            Email Analytics
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Template Performance
                                        </Typography>
                                        {emailTemplates.map((template) => (
                                            <Box key={template.id} sx={{ mb: 2 }}>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                                                    <Typography variant="body2">{template.name}</Typography>
                                                    <Typography variant="body2">{template.openRate}%</Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={template.openRate}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                            </Box>
                                        ))}
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Recent Campaign Results
                                        </Typography>
                                        {broadcastMessages
                                            .filter((m) => m.status === "sent")
                                            .map((message) => (
                                                <Box key={message.id} sx={{ mb: 3 }}>
                                                    <Typography variant="body2" fontWeight="medium" gutterBottom>
                                                        {message.title}
                                                    </Typography>
                                                    <Grid container spacing={2}>
                                                        <Grid item xs={6}>
                                                            <Typography variant="caption" color="textSecondary">
                                                                Recipients
                                                            </Typography>
                                                            <Typography variant="body2">{message.recipients.toLocaleString()}</Typography>
                                                        </Grid>
                                                        <Grid item xs={3}>
                                                            <Typography variant="caption" color="textSecondary">
                                                                Opens
                                                            </Typography>
                                                            <Typography variant="body2">{message.openRate}%</Typography>
                                                        </Grid>
                                                        <Grid item xs={3}>
                                                            <Typography variant="caption" color="textSecondary">
                                                                Clicks
                                                            </Typography>
                                                            <Typography variant="body2">{message.clickRate}%</Typography>
                                                        </Grid>
                                                    </Grid>
                                                </Box>
                                            ))}
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}

                {/* Settings Tab */}
                {tabValue === 3 && (
                    <Box sx={{ p: 3 }}>
                        <Typography variant="h5" gutterBottom>
                            Email Settings
                        </Typography>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            SMTP Configuration
                                        </Typography>
                                        <TextField label="SMTP Server" defaultValue="smtp.example.com" fullWidth sx={{ mb: 2 }} />
                                        <TextField label="Port" defaultValue="587" fullWidth sx={{ mb: 2 }} />
                                        <TextField label="Username" defaultValue="noreply@example.com" fullWidth sx={{ mb: 2 }} />
                                        <TextField label="Password" type="password" fullWidth sx={{ mb: 2 }} />
                                        <FormControlLabel control={<Switch defaultChecked />} label="Enable SSL/TLS" />
                                    </CardContent>
                                    <CardActions>
                                        <Button variant="contained">Save Settings</Button>
                                        <Button>Test Connection</Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Default Settings
                                        </Typography>
                                        <TextField label="From Name" defaultValue="Your Company" fullWidth sx={{ mb: 2 }} />
                                        <TextField label="From Email" defaultValue="noreply@example.com" fullWidth sx={{ mb: 2 }} />
                                        <TextField label="Reply-To Email" defaultValue="support@example.com" fullWidth sx={{ mb: 2 }} />
                                        <FormControlLabel control={<Switch defaultChecked />} label="Track Opens" />
                                        <FormControlLabel control={<Switch defaultChecked />} label="Track Clicks" />
                                    </CardContent>
                                    <CardActions>
                                        <Button variant="contained">Save Settings</Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        </Grid>
                    </Box>
                )}
            </Paper>

            {/* Template Edit Dialog */}
            <Dialog open={templateDialogOpen} onClose={() => setTemplateDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>{selectedTemplate?.id ? "Edit Template" : "Create Template"}</DialogTitle>
                <DialogContent>
                    {selectedTemplate && (
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Template Name"
                                    value={selectedTemplate.name}
                                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, name: e.target.value })}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Template Type</InputLabel>
                                    <Select
                                        value={selectedTemplate.type}
                                        label="Template Type"
                                        onChange={(e) => setSelectedTemplate({ ...selectedTemplate, type: e.target.value })}
                                    >
                                        <MenuItem value="signup">Sign Up</MenuItem>
                                        <MenuItem value="payment_failed">Payment Failed</MenuItem>
                                        <MenuItem value="trial_ending">Trial Ending</MenuItem>
                                        <MenuItem value="subscription_renewed">Subscription Renewed</MenuItem>
                                        <MenuItem value="custom">Custom</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Subject Line"
                                    value={selectedTemplate.subject}
                                    onChange={(e) => setSelectedTemplate({ ...selectedTemplate, subject: e.target.value })}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Email Content"
                                    multiline
                                    rows={8}
                                    placeholder="Enter your email content here..."
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTemplateDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained">Save Template</Button>
                </DialogActions>
            </Dialog>

            {/* Broadcast Dialog */}
            <Dialog open={broadcastDialogOpen} onClose={() => setBroadcastDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Broadcast Message</DialogTitle>
                <DialogContent>
                    {selectedBroadcast && (
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={8}>
                                <TextField
                                    label="Message Title"
                                    value={selectedBroadcast.title}
                                    onChange={(e) => setSelectedBroadcast({ ...selectedBroadcast, title: e.target.value })}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={4}>
                                <FormControl fullWidth>
                                    <InputLabel>Message Type</InputLabel>
                                    <Select
                                        value={selectedBroadcast.type}
                                        label="Message Type"
                                        onChange={(e) => setSelectedBroadcast({ ...selectedBroadcast, type: e.target.value })}
                                    >
                                        <MenuItem value="email">Email</MenuItem>
                                        <MenuItem value="sms">SMS</MenuItem>
                                        <MenuItem value="push">Push Notification</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    label="Message Content"
                                    value={selectedBroadcast.content}
                                    onChange={(e) => setSelectedBroadcast({ ...selectedBroadcast, content: e.target.value })}
                                    multiline
                                    rows={6}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Target Recipients"
                                    type="number"
                                    value={selectedBroadcast.recipients}
                                    onChange={(e) => setSelectedBroadcast({ ...selectedBroadcast, recipients: Number(e.target.value) })}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <TextField
                                    label="Schedule Date (Optional)"
                                    type="datetime-local"
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBroadcastDialogOpen(false)}>Cancel</Button>
                    <Button variant="outlined">Save as Draft</Button>
                    <Button variant="contained" startIcon={<SendIcon />}>
                        Send Now
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default NotificationMessage;