import { useState } from "react";
import {
    Box, Paper, Typography,
    Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow,
    TablePagination, Chip, Button,
    TextField, InputAdornment, IconButton,
    Dialog, DialogTitle, DialogContent,
    DialogActions, Grid, Card,
    CardContent, Tabs, Tab,
    useTheme, alpha,
} from "@mui/material";
import {
    Search as SearchIcon,
    FilterList as FilterIcon,
    Visibility as ViewIcon,
    Block as BlockIcon,
    CheckCircle as CheckCircleIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import "./CustomerManagment.scss";


const CustomerManagement = () => {
    const theme = useTheme();
    const [customers] = useState([
        {
            id: "1",
            name: "John Doe",
            email: "john@company.com",
            company: "Tech Corp",
            plan: "Professional",
            status: "paid",
            joinDate: "2024-01-15",
            lastActive: "2024-01-20",
            revenue: 299,
        },
        {
            id: "2",
            name: "Jane Smith",
            email: "jane@startup.com",
            company: "Startup Inc",
            plan: "Basic",
            status: "trial",
            joinDate: "2024-01-18",
            trialEndDate: "2024-02-01",
            lastActive: "2024-01-19",
            revenue: 0,
        },
        {
            id: "3",
            name: "Mike Johnson",
            email: "mike@enterprise.com",
            company: "Enterprise Ltd",
            plan: "Enterprise",
            status: "suspended",
            joinDate: "2023-12-01",
            lastActive: "2024-01-10",
            revenue: 999,
        },
    ]);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [actionType, setActionType] = useState(null);
    const [tabValue, setTabValue] = useState(0);

    const getStatusColor = (status) => {
        switch (status) {
            case "paid":
                return "success";
            case "trial":
                return "warning";
            case "suspended":
                return "error";
            case "expired":
                return "default";
            default:
                return "default";
        }
    };

    const handleViewDetails = (customer) => {
        setSelectedCustomer(customer);
        setDetailsOpen(true);
    };

    const handleAction = (customer, action) => {
        setSelectedCustomer(customer);
        setActionType(action);
        setActionDialogOpen(true);
    };

    const confirmAction = () => {
        // Handle suspend/reactivate logic here
        console.log(`${actionType} customer:`, selectedCustomer?.id);
        setActionDialogOpen(false);
        setActionType(null);
        setSelectedCustomer(null);
    };

    const filteredCustomers = customers.filter(
        (customer) =>
            customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            customer.company.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        totalCustomers: customers.length,
        activeCustomers: customers.filter((c) => c.status === "paid").length,
        trialCustomers: customers.filter((c) => c.status === "trial").length,
        totalRevenue: customers.reduce((sum, c) => sum + c.revenue, 0),
    };

    return (
        <Box className="customer-management" sx={{ p: 3 }}>
            <Typography variant="h4" sx={{ mb: 3, color: theme.palette.text.primary }}>
                Customer Management
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
                                        {stats.totalCustomers}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Customers
                                    </Typography>
                                </Box>
                                <PersonIcon sx={{ fontSize: 40, color: theme.palette.primary.main }} />
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
                                        {stats.activeCustomers}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Active Customers
                                    </Typography>
                                </Box>
                                <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.secondary.main }} />
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
                                        {stats.trialCustomers}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Trial Users
                                    </Typography>
                                </Box>
                                <BusinessIcon sx={{ fontSize: 40, color: "#ff9800" }} />
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
                                        ${stats.totalRevenue}
                                    </Typography>
                                    <Typography variant="body2" color="textSecondary">
                                        Total Revenue
                                    </Typography>
                                </Box>
                                <TrendingUpIcon sx={{ fontSize: 40, color: "#4caf50" }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Search and Filters */}
            <Paper sx={{ p: 2, mb: 3, backgroundColor: theme.palette.background.paper }}>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <TextField
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon />
                                </InputAdornment>
                            ),
                        }}
                        sx={{ flexGrow: 1 }}
                    />
                    <Button variant="outlined" startIcon={<FilterIcon />} sx={{ minWidth: 120 }}>
                        Filters
                    </Button>
                </Box>
            </Paper>

            {/* Tabs */}
            <Paper sx={{ backgroundColor: theme.palette.background.paper }}>
                <Tabs
                    value={tabValue}
                    onChange={(_, newValue) => setTabValue(newValue)}
                    sx={{ borderBottom: 1, borderColor: "divider" }}
                >
                    <Tab label="All Customers" />
                    <Tab label="Active" />
                    <Tab label="Trial" />
                    <Tab label="Suspended" />
                </Tabs>

                {/* Customer Table */}
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Customer</TableCell>
                                <TableCell>Company</TableCell>
                                <TableCell>Plan</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Join Date</TableCell>
                                <TableCell>Last Active</TableCell>
                                <TableCell>Revenue</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((customer) => (
                                <TableRow key={customer.id} hover>
                                    <TableCell>
                                        <Box>
                                            <Typography variant="body2" fontWeight="medium">
                                                {customer.name}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {customer.email}
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>{customer.company}</TableCell>
                                    <TableCell>{customer.plan}</TableCell>
                                    <TableCell>
                                        <Chip label={customer.status} color={getStatusColor(customer.status)} size="small" />
                                    </TableCell>
                                    <TableCell>{customer.joinDate}</TableCell>
                                    <TableCell>{customer.lastActive}</TableCell>
                                    <TableCell>${customer.revenue}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                            <IconButton size="small" onClick={() => handleViewDetails(customer)}>
                                                <ViewIcon />
                                            </IconButton>
                                            {customer.status !== "suspended" ? (
                                                <IconButton size="small" onClick={() => handleAction(customer, "suspend")} color="error">
                                                    <BlockIcon />
                                                </IconButton>
                                            ) : (
                                                <IconButton size="small" onClick={() => handleAction(customer, "reactivate")} color="success">
                                                    <CheckCircleIcon />
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
                    count={filteredCustomers.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(Number.parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                />
            </Paper>

            {/* Customer Details Dialog */}
            <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Customer Details</DialogTitle>
                <DialogContent>
                    {selectedCustomer && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Basic Information
                                </Typography>
                                <Typography>
                                    <strong>Name:</strong> {selectedCustomer.name}
                                </Typography>
                                <Typography>
                                    <strong>Email:</strong> {selectedCustomer.email}
                                </Typography>
                                <Typography>
                                    <strong>Company:</strong> {selectedCustomer.company}
                                </Typography>
                                <Typography>
                                    <strong>Status:</strong>
                                    <Chip
                                        label={selectedCustomer.status}
                                        color={getStatusColor(selectedCustomer.status)}
                                        size="small"
                                        sx={{ ml: 1 }}
                                    />
                                </Typography>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Typography variant="h6" gutterBottom>
                                    Subscription Details
                                </Typography>
                                <Typography>
                                    <strong>Plan:</strong> {selectedCustomer.plan}
                                </Typography>
                                <Typography>
                                    <strong>Join Date:</strong> {selectedCustomer.joinDate}
                                </Typography>
                                <Typography>
                                    <strong>Last Active:</strong> {selectedCustomer.lastActive}
                                </Typography>
                                <Typography>
                                    <strong>Revenue:</strong> ${selectedCustomer.revenue}
                                </Typography>
                                {selectedCustomer.trialEndDate && (
                                    <Typography>
                                        <strong>Trial Ends:</strong> {selectedCustomer.trialEndDate}
                                    </Typography>
                                )}
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailsOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Action Confirmation Dialog */}
            <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)}>
                <DialogTitle>Confirm {actionType === "suspend" ? "Suspension" : "Reactivation"}</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to {actionType} {selectedCustomer?.name}?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setActionDialogOpen(false)}>Cancel</Button>
                    <Button onClick={confirmAction} color={actionType === "suspend" ? "error" : "success"} variant="contained">
                        Confirm
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default CustomerManagement;