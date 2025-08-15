"use client"

import { useState } from "react";
import {
  Box, Paper, Typography,
  Grid, Card, CardContent,
  Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
  Chip, LinearProgress, List,
  ListItem, ListItemText, ListItemIcon,
  Avatar, useTheme, alpha, IconButton,
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  AttachMoney as MoneyIcon,
  Notifications as NotificationsIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import "./Dashboard.scss";


const Dashboard = () => {
  const theme = useTheme();

  const [stats] = useState({
    totalCustomers: 2847,
    customerGrowth: 12.5,
    totalRevenue: 89420,
    revenueGrowth: 8.3,
    activeSubscriptions: 2156,
    subscriptionGrowth: 15.2,
    pendingPayments: 23,
    paymentGrowth: -5.1,
  });

  const [recentActivities] = useState([
    {
      id: "1",
      type: "signup",
      customer: "John Smith",
      description: "New customer signed up for Professional plan",
      amount: 299,
      timestamp: "2 minutes ago",
    },
    {
      id: "2",
      type: "payment",
      customer: "Tech Corp",
      description: "Payment received for Enterprise plan",
      amount: 999,
      timestamp: "15 minutes ago",
    },
    {
      id: "3",
      type: "upgrade",
      customer: "Startup Inc",
      description: "Upgraded from Basic to Professional",
      amount: 200,
      timestamp: "1 hour ago",
    },
    {
      id: "4",
      type: "cancellation",
      customer: "Small Business LLC",
      description: "Subscription cancelled",
      timestamp: "2 hours ago",
    },
    {
      id: "5",
      type: "payment",
      customer: "Enterprise Solutions",
      description: "Monthly payment processed",
      amount: 1299,
      timestamp: "3 hours ago",
    },
  ]);

  const [topCustomers] = useState([
    {
      id: "1",
      name: "Enterprise Solutions",
      email: "admin@enterprise.com",
      company: "Enterprise Solutions Inc",
      revenue: 15600,
      plan: "Enterprise",
    },
    {
      id: "2",
      name: "Tech Innovators",
      email: "contact@techinnovators.com",
      company: "Tech Innovators Ltd",
      revenue: 8400,
      plan: "Professional",
    },
    {
      id: "3",
      name: "Digital Agency",
      email: "hello@digitalagency.com",
      company: "Digital Agency Co",
      revenue: 5970,
      plan: "Professional",
    },
    {
      id: "4",
      name: "Startup Hub",
      email: "info@startuphub.com",
      company: "Startup Hub Inc",
      revenue: 4200,
      plan: "Basic",
    },
    {
      id: "5",
      name: "Creative Studio",
      email: "team@creativestudio.com",
      company: "Creative Studio LLC",
      revenue: 3580,
      plan: "Professional",
    },
  ]);

  const getActivityIcon = (type) => {
    switch (type) {
      case "signup":
        return <PeopleIcon sx={{ color: theme.palette.success.main }} />;
      case "payment":
        return <MoneyIcon sx={{ color: theme.palette.primary.main }} />;
      case "upgrade":
        return <TrendingUpIcon sx={{ color: theme.palette.secondary.main }} />;
      case "cancellation":
        return <ErrorIcon sx={{ color: theme.palette.error.main }} />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "signup":
        return "success";
      case "payment":
        return "primary";
      case "upgrade":
        return "secondary";
      case "cancellation":
        return "error";
      default:
        return "default";
    }
  };

  const getPlanColor = (plan) => {
    switch (plan) {
      case "Enterprise":
        return theme.palette.secondary.main;
      case "Professional":
        return theme.palette.primary.main;
      case "Basic":
        return "#ff9800";
      default:
        return theme.palette.text.secondary;
    }
  };

  return (
    <Box className="dashboard" sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, color: theme.palette.text.primary }}>
        Dashboard Overview
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
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
                  <Typography variant="h4" sx={{ color: theme.palette.primary.main, fontWeight: "bold" }}>
                    {stats.totalCustomers.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Total Customers
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TrendingUpIcon sx={{ fontSize: 16, color: "success.main" }} />
                    <Typography variant="caption" sx={{ color: "success.main", fontWeight: "medium" }}>
                      +{stats.customerGrowth}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      this month
                    </Typography>
                  </Box>
                </Box>
                <PeopleIcon sx={{ fontSize: 48, color: theme.palette.primary.main, opacity: 0.8 }} />
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
                  <Typography variant="h4" sx={{ color: "#4caf50", fontWeight: "bold" }}>
                    ${stats.totalRevenue.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Total Revenue
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TrendingUpIcon sx={{ fontSize: 16, color: "success.main" }} />
                    <Typography variant="caption" sx={{ color: "success.main", fontWeight: "medium" }}>
                      +{stats.revenueGrowth}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      this month
                    </Typography>
                  </Box>
                </Box>
                <MoneyIcon sx={{ fontSize: 48, color: "#4caf50", opacity: 0.8 }} />
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
                  <Typography variant="h4" sx={{ color: theme.palette.secondary.main, fontWeight: "bold" }}>
                    {stats.activeSubscriptions.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Active Subscriptions
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TrendingUpIcon sx={{ fontSize: 16, color: "success.main" }} />
                    <Typography variant="caption" sx={{ color: "success.main", fontWeight: "medium" }}>
                      +{stats.subscriptionGrowth}%
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      this month
                    </Typography>
                  </Box>
                </Box>
                <BusinessIcon sx={{ fontSize: 48, color: theme.palette.secondary.main, opacity: 0.8 }} />
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
                  <Typography variant="h4" sx={{ color: "#ff9800", fontWeight: "bold" }}>
                    {stats.pendingPayments}
                  </Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Pending Payments
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <TrendingDownIcon sx={{ fontSize: 16, color: "success.main" }} />
                    <Typography variant="caption" sx={{ color: "success.main", fontWeight: "medium" }}>
                      {Math.abs(stats.paymentGrowth)}% less
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      this month
                    </Typography>
                  </Box>
                </Box>
                <WarningIcon sx={{ fontSize: 48, color: "#ff9800", opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Revenue Chart Placeholder */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              Revenue Overview
            </Typography>
            <Box
              sx={{
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: alpha(theme.palette.primary.main, 0.05),
                borderRadius: 2,
                border: `2px dashed ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              <Box sx={{ textAlign: "center" }}>
                <TrendingUpIcon sx={{ fontSize: 64, color: theme.palette.primary.main, mb: 2 }} />
                <Typography variant="h6" color="textSecondary">
                  Revenue Chart
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Chart component would be integrated here
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12} lg={4}>
          <Paper sx={{ p: 3, backgroundColor: theme.palette.background.paper, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Stats
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Trial Conversion Rate</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    68%
                  </Typography>
                </Box>
                <LinearProgress variant="determinate" value={68} sx={{ height: 8, borderRadius: 4 }} />
              </Box>
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Customer Satisfaction</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    92%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={92}
                  color="secondary"
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Email Open Rate</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    85%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={85}
                  sx={{ height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { backgroundColor: "#4caf50" } }}
                />
              </Box>
              <Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                  <Typography variant="body2">Server Uptime</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    99.9%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={99.9}
                  sx={{ height: 8, borderRadius: 4, "& .MuiLinearProgress-bar": { backgroundColor: "#4caf50" } }}
                />
              </Box>
            </Box>
          </Paper>

          {/* System Alerts */}
          <Paper sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              System Alerts
            </Typography>
            <List dense>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <CheckCircleIcon sx={{ color: "success.main" }} />
                </ListItemIcon>
                <ListItemText
                  primary="All systems operational"
                  secondary="Last checked: 2 minutes ago"
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <WarningIcon sx={{ color: "warning.main" }} />
                </ListItemIcon>
                <ListItemText
                  primary="High server load detected"
                  secondary="CPU usage: 78%"
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
              <ListItem sx={{ px: 0 }}>
                <ListItemIcon>
                  <ScheduleIcon sx={{ color: "info.main" }} />
                </ListItemIcon>
                <ListItemText
                  primary="Scheduled maintenance"
                  secondary="Sunday 2:00 AM - 4:00 AM"
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>

        {/* Recent Activities */}
        <Grid item xs={12} lg={7}>
          <Paper sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <List>
              {recentActivities.map((activity) => (
                <ListItem key={activity.id} sx={{ px: 0, py: 1.5 }}>
                  <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {activity.customer}
                        </Typography>
                        <Chip
                          label={activity.type}
                          size="small"
                          color={getActivityColor(activity.type)}
                          sx={{ textTransform: "capitalize" }}
                        />
                        {activity.amount && (
                          <Typography variant="body2" sx={{ color: "success.main", fontWeight: "medium" }}>
                            +${activity.amount}
                          </Typography>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="textSecondary">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {activity.timestamp}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Top Customers */}
        <Grid item xs={12} lg={5}>
          <Paper sx={{ p: 3, backgroundColor: theme.palette.background.paper }}>
            <Typography variant="h6" gutterBottom>
              Top Customers
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Customer</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell align="right">Revenue</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topCustomers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              backgroundColor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              fontSize: "0.875rem",
                            }}
                          >
                            {customer.name.charAt(0)}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {customer.name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {customer.company}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={customer.plan}
                          size="small"
                          sx={{
                            backgroundColor: alpha(getPlanColor(customer.plan), 0.1),
                            color: getPlanColor(customer.plan),
                            fontWeight: "medium",
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight="medium" sx={{ color: "success.main" }}>
                          ${customer.revenue.toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <IconButton size="small">
                          <MoreVertIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;