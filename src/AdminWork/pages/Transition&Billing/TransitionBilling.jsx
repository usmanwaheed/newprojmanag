import { useState, useEffect } from "react";
import {
    Box, Paper, Typography,
    Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
    TablePagination, Chip, Button,
    TextField, InputAdornment, IconButton,
    Dialog, DialogTitle, DialogContent,
    DialogActions, Grid, Card,
    CardContent, FormControl, InputLabel,
    Select, MenuItem, Tabs,
    Tab, useTheme, alpha,
    CircularProgress, Alert,
    Snackbar,
} from "@mui/material";
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Download as DownloadIcon,
    Visibility as ViewIcon,
    Refresh as RefreshIcon,
    AttachMoney as MoneyIcon,
    Receipt as ReceiptIcon,
    CreditCard as CreditCardIcon,
    TrendingUp as TrendingUpIcon,
    DateRange as DateRangeIcon,
    ToggleOff as ToggleOffIcon,
    ToggleOn as ToggleOnIcon,
    Cancel as CancelIcon,
} from "@mui/icons-material";
import "./Transition&Billing.scss";
import {
    useAllSubscriptions,
    useSubscriptionAnalytics,
    useToggleSubscriptionStatus,
    useCancelSubscription,
} from "../../hooks/subscriptionHook";

const TransitionBilling = () => {
    const theme = useTheme();

    // API Hooks
    const { data: subscriptionsData, isLoading: subscriptionsLoading, error: subscriptionsError } = useAllSubscriptions();
    const { data: analyticsData, isLoading: analyticsLoading, error: analyticsError } = useSubscriptionAnalytics();
    const toggleStatusMutation = useToggleSubscriptionStatus();
    const cancelSubscriptionMutation = useCancelSubscription();

    // Component State
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

    // Process subscriptions data
    const subscriptions = subscriptionsData?.data || [];
    const analytics = analyticsData?.data || {};

    const getStatusColor = (status) => {
        switch (status) {
            case "active":
                return "success";
            case "trial":
                return "info";
            case "canceled":
                return "error";
            case "expired":
                return "warning";
            case "past_due":
                return "error";
            case "unpaid":
                return "warning";
            default:
                return "default";
        }
    };

    const handleViewDetails = (subscription) => {
        setSelectedSubscription(subscription);
        setDetailsOpen(true);
    };

    const handleToggleStatus = async (subscriptionId) => {
        try {
            await toggleStatusMutation.mutateAsync(subscriptionId);
            setSnackbar({
                open: true,
                message: "Subscription status updated successfully",
                severity: "success"
            });
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Failed to update subscription status",
                severity: "error"
            });
        }
    };

    const handleCancelSubscription = (subscription) => {
        setSelectedSubscription(subscription);
        setCancelDialogOpen(true);
    };

    const confirmCancelSubscription = async () => {
        try {
            await cancelSubscriptionMutation.mutateAsync(selectedSubscription._id);
            setSnackbar({
                open: true,
                message: "Subscription canceled successfully",
                severity: "success"
            });
            setCancelDialogOpen(false);
            setSelectedSubscription(null);
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Failed to cancel subscription",
                severity: "error"
            });
        }
    };

    const handleDownloadInvoice = (subscription) => {
        // Implementation for downloading invoice
        console.log("Download invoice for subscription:", subscription._id);
        // You can implement PDF generation or redirect to invoice endpoint
    };

    const filteredSubscriptions = subscriptions.filter((subscription) => {
        const matchesSearch =
            subscription.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subscription.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            subscription.planId?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === "all" || subscription.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    if (subscriptionsLoading || analyticsLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (subscriptionsError || analyticsError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Failed to load data. Please try again later.
                </Alert>
            </Box>
        );
    }

    return (
        <Box className="transactions-billing" sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, color: theme.palette.text.primary }}>
                Subscriptions & Billing
            </Typography>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
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
                                        {formatCurrency(analytics.monthlyRevenue || 0)}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Monthly Revenue
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
                            backgroundColor: alpha("#2196f3", 0.1),
                            border: `1px solid ${alpha("#2196f3", 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: "#2196f3" }}>
                                        {analytics.activeSubscriptions || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Active Subscriptions
                                    </Typography>
                                </Box>
                                <MoneyIcon sx={{ fontSize: 40, color: "#2196f3" }} />
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
                                        {analytics.trialSubscriptions || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Trial Subscriptions
                                    </Typography>
                                </Box>
                                <CreditCardIcon sx={{ fontSize: 40, color: "#ff9800" }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        sx={{
                            backgroundColor: alpha("#f44336", 0.1),
                            border: `1px solid ${alpha("#f44336", 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                    <Typography variant="h4" sx={{ color: "#f44336" }}>
                                        {analytics.canceledSubscriptions || 0}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Canceled Subscriptions
                                    </Typography>
                                </Box>
                                <ReceiptIcon sx={{ fontSize: 40, color: "#f44336" }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Filters */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: theme.palette.background.paper }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            placeholder="Search subscriptions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                            fullWidth
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="all">All Status</MenuItem>
                                <MenuItem value="active">Active</MenuItem>
                                <MenuItem value="trial">Trial</MenuItem>
                                <MenuItem value="canceled">Canceled</MenuItem>
                                <MenuItem value="expired">Expired</MenuItem>
                                <MenuItem value="past_due">Past Due</MenuItem>
                                <MenuItem value="unpaid">Unpaid</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button variant="outlined" startIcon={<DateRangeIcon />} fullWidth>
                            Date Range
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Button variant="outlined" startIcon={<FilterIcon />} fullWidth>
                            More Filters
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Subscriptions Table */}
            <Paper sx={{ backgroundColor: theme.palette.background.paper }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                    <Tab label="All Subscriptions" />
                    <Tab label="Active" />
                    <Tab label="Trials" />
                    <Tab label="Canceled" />
                </Tabs>

                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Customer</TableCell>
                                <TableCell>Plan</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Start Date</TableCell>
                                <TableCell>End Date</TableCell>
                                <TableCell>Payment Method</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredSubscriptions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((subscription) => (
                                <TableRow key={subscription._id} hover>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {subscription.userId?.name || 'N/A'}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {subscription.userId?.email || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {subscription.planId?.name || 'N/A'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {subscription.planId?.billingCycle || 'N/A'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">
                                            {formatCurrency(subscription.amount)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={subscription.status}
                                            color={getStatusColor(subscription.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{formatDate(subscription.startDate)}</TableCell>
                                    <TableCell>{formatDate(subscription.endDate)}</TableCell>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                            {subscription.paymentMethod}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleViewDetails(subscription)}
                                                title="View Details"
                                            >
                                                <ViewIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleDownloadInvoice(subscription)}
                                                title="Download Invoice"
                                            >
                                                <DownloadIcon />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggleStatus(subscription._id)}
                                                title={subscription.isActive ? "Deactivate" : "Activate"}
                                                color={subscription.isActive ? "error" : "success"}
                                            >
                                                {subscription.isActive ? <ToggleOnIcon /> : <ToggleOffIcon />}
                                            </IconButton>
                                            {subscription.status !== "canceled" && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleCancelSubscription(subscription)}
                                                    title="Cancel Subscription"
                                                    color="error"
                                                >
                                                    <CancelIcon />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredSubscriptions.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(Number.parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </Paper>

            {/* Subscription Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Subscription Details</DialogTitle>
                <DialogContent>
                    {selectedSubscription && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Subscription Information
                                </Typography>
                                <Typography>
                                    <strong>Status:</strong>
                                    <Chip
                                        label={selectedSubscription.status}
                                        color={getStatusColor(selectedSubscription.status)}
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                </Typography>
                                <Typography>
                                    <strong>Amount:</strong> {formatCurrency(selectedSubscription.amount)}
                                </Typography>
                                <Typography>
                                    <strong>Start Date:</strong> {formatDate(selectedSubscription.startDate)}
                                </Typography>
                                <Typography>
                                    <strong>End Date:</strong> {formatDate(selectedSubscription.endDate)}
                                </Typography>
                                {selectedSubscription.trialEndDate && (
                                    <Typography>
                                        <strong>Trial End Date:</strong> {formatDate(selectedSubscription.trialEndDate)}
                                    </Typography>
                                )}
                                <Typography>
                                    <strong>Auto Renew:</strong> {selectedSubscription.isAutoRenew ? 'Yes' : 'No'}
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Customer & Plan Details
                                </Typography>
                                <Typography>
                                    <strong>Customer:</strong> {selectedSubscription.userId?.name || 'N/A'}
                                </Typography>
                                <Typography>
                                    <strong>Email:</strong> {selectedSubscription.userId?.email || 'N/A'}
                                </Typography>
                                <Typography>
                                    <strong>Plan:</strong> {selectedSubscription.planId?.name || 'N/A'}
                                </Typography>
                                <Typography>
                                    <strong>Billing Cycle:</strong> {selectedSubscription.planId?.billingCycle || 'N/A'}
                                </Typography>
                                <Typography>
                                    <strong>Payment Method:</strong> {selectedSubscription.paymentMethod}
                                </Typography>
                                {selectedSubscription.stripeSubscriptionId && (
                                    <Typography>
                                        <strong>Stripe Subscription ID:</strong> {selectedSubscription.stripeSubscriptionId}
                                    </Typography>
                                )}
                            </Grid>
                            {selectedSubscription.usage && (
                                <Grid item xs={12}>
                                    <Typography variant="h6" gutterBottom>
                                        Usage Information
                                    </Typography>
                                    <Typography>
                                        <strong>Users:</strong> {selectedSubscription.usage.users}
                                    </Typography>
                                    <Typography>
                                        <strong>Storage:</strong> {(selectedSubscription.usage.storage / (1024 * 1024 * 1024)).toFixed(2)} GB
                                    </Typography>
                                    <Typography>
                                        <strong>API Calls:</strong> {selectedSubscription.usage.apiCalls}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                    <Button variant="contained" startIcon={<DownloadIcon />}>
                        Download Invoice
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Cancel Subscription Dialog */}
            <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)}>
                <DialogTitle>Cancel Subscription</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        Are you sure you want to cancel the subscription for {selectedSubscription?.userId?.name}?
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Plan: {selectedSubscription?.planId?.name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Amount: {formatCurrency(selectedSubscription?.amount || 0)}
                    </Typography>
                    <Typography variant="body2" color="error" sx={{ mt: 2 }}>
                        This action cannot be undone.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCancelDialogOpen(false)}>Cancel</Button>
                    <Button
                        onClick={confirmCancelSubscription}
                        color="error"
                        variant="contained"
                        disabled={cancelSubscriptionMutation.isLoading}
                    >
                        {cancelSubscriptionMutation.isLoading ? 'Canceling...' : 'Cancel Subscription'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default TransitionBilling;