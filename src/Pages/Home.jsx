import React, { useState, useMemo } from 'react';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent, Divider, Stack, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, CircularProgress, Snackbar,
  useTheme, Skeleton
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import DashboardImg1 from "../assets/dashboard1.jpg";
import DashboardImg2 from "../assets/dashboard2.jpg";
import DashboardImg4 from "../assets/dashboard4.jpg";
import DashboardImg6 from "../assets/dashboard6.jpg";
import TrackChangesIcon from '@mui/icons-material/TrackChanges';
import GroupIcon from '@mui/icons-material/Group';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ScreenshotIcon from '@mui/icons-material/Screenshot';
import SecurityIcon from '@mui/icons-material/Security';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import {
  Diamond as DiamondIcon, CheckCircle as CheckCircleIcon,
  TaskAlt as TaskAltIcon, Star as StarIcon, Business as BusinessIcon,
} from "@mui/icons-material";
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { usePublicPlans } from "../AdminWork/hooks/planHooks";
import { RouteNames } from "../Constants/route";
import { useAuth } from "../context/AuthProvider";
import { useCancelSubscription, useChangeSubscriptionPlan, useCurrentSubscription } from "../AdminWork/hooks/subscriptionHook";

// Feature data moved outside component to prevent re-renders
const FEATURES = [
  {
    icon: TaskAltIcon,
    title: "Task Assignment",
    description: "Assign tasks and subtasks to specific team members with clear ownership and deadlines."
  },
  {
    icon: TrackChangesIcon,
    title: "Progress Tracking",
    description: "Real-time tracking with automated screenshots and activity monitoring."
  },
  {
    icon: ScreenshotIcon,
    title: "Media Capture",
    description: "Automatic screenshot capture and support for video/image uploads."
  },
  {
    icon: GroupIcon,
    title: "Team Collaboration",
    description: "Seamless task delegation between team members with notifications."
  },
  {
    icon: AdminPanelSettingsIcon,
    title: "Admin Controls",
    description: "Approval workflows and comprehensive oversight for administrators."
  },
  {
    icon: SecurityIcon,
    title: "Role Security",
    description: "Granular role-based permissions to control system access."
  },
];

const BENEFITS = [
  "Reduce task completion time by up to 60%",
  "Improve accountability with automated tracking",
  "Streamline approval workflows",
  "Maintain compliance with detailed audit logs",
  "Enterprise-grade security standards"
];

// Loading skeleton component
const PlanSkeleton = () => (
  <Card variant="outlined" sx={{ height: "100%", borderRadius: 3 }}>
    <CardContent>
      <Stack spacing={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Skeleton variant="text" width={120} height={32} />
        </Box>
        <Skeleton variant="text" width={100} height={40} />
        <Divider />
        <Skeleton variant="text" width="100%" height={20} />
        <Stack spacing={1}>
          {[1, 2, 3].map(i => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Skeleton variant="circular" width={16} height={16} />
              <Skeleton variant="text" width="80%" height={20} />
            </Box>
          ))}
        </Stack>
      </Stack>
    </CardContent>
    <Box sx={{ p: 2 }}>
      <Skeleton variant="rectangular" width="100%" height={48} sx={{ borderRadius: '12px' }} />
    </Box>
  </Card>
);

export default function Home() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { data: plans = [], isLoading: plansLoading, error: plansError } = usePublicPlans();
  const { user } = useAuth();

  // Subscription state
  const [cancelDialog, setCancelDialog] = useState(false);
  const [changePlanDialog, setChangePlanDialog] = useState(false);
  const [selectedNewPlan, setSelectedNewPlan] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Fetch current subscription
  const { data: currentSubscription, isLoading: subscriptionLoading } = useCurrentSubscription();

  // Mutations
  const cancelMutation = useCancelSubscription();
  const changePlanMutation = useChangeSubscriptionPlan();

  // Memoized helper functions
  const getPlanIcon = useMemo(() => (planName) => {
    const iconProps = { sx: { fontSize: 40, color: 'primary.main' } };
    switch (planName?.toLowerCase()) {
      case 'basic':
        return <StarIcon {...iconProps} />;
      case 'pro':
        return <BusinessIcon {...iconProps} />;
      case 'premium':
        return <WorkspacePremiumIcon {...iconProps} />;
      case 'enterprise':
        return <DiamondIcon {...iconProps} />;
      default:
        return <StarIcon {...iconProps} />;
    }
  }, []);

  const formatDate = useMemo(() => (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  const getStatusChip = useMemo(() => (status) => {
    const statusConfig = {
      active: { color: 'success', label: 'Active' },
      trial: { color: 'info', label: 'Trial' },
      canceled: { color: 'error', label: 'Canceled' },
      expired: { color: 'warning', label: 'Expired' },
    };
    const config = statusConfig[status] || { color: 'default', label: status };
    return <Chip label={config.label} color={config.color} size="small" />;
  }, []);

  // Event handlers
  const handleCancelSubscription = async () => {
    if (!currentSubscription?.data?._id) return;

    try {
      await cancelMutation.mutateAsync(currentSubscription.data._id);
      setSnackbar({ open: true, message: 'Subscription canceled successfully', severity: 'success' });
      setCancelDialog(false);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to cancel subscription',
        severity: 'error'
      });
    }
  };

  const handleChangePlan = async () => {
    if (!currentSubscription?.data?._id || !selectedNewPlan) return;

    try {
      await changePlanMutation.mutateAsync({
        id: currentSubscription.data._id,
        newPlanId: selectedNewPlan._id,
        reason: 'User requested plan change'
      });
      setSnackbar({ open: true, message: 'Plan changed successfully', severity: 'success' });
      setChangePlanDialog(false);
      setSelectedNewPlan(null);
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.message || 'Failed to change plan',
        severity: 'error'
      });
    }
  };

  const handlePlanAction = (plan) => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!currentSubscription?.data) {
      navigate(`/${RouteNames.PAYMENTSELECTION}/${plan}`);
    } else {
      // User has subscription - handle plan change
      setSelectedNewPlan(plan);
      setChangePlanDialog(true);
    }
  };

  // Utility functions
  const isCurrentPlan = (planId) => currentSubscription?.data?.planId?._id === planId;
  const canUpgradeTo = (plan) => {
    if (!currentSubscription?.data?.planId) return true;
    return plan.price > currentSubscription.data.planId.price;
  };

  // Loading state
  if (plansLoading || subscriptionLoading) {
    return (
      <Box sx={{ backgroundColor: "background.default", minHeight: '100vh' }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        </Container>
        <Footer />
      </Box>
    );
  }

  // Error state
  if (plansError) {
    return (
      <Box sx={{ backgroundColor: "background.default", minHeight: '100vh' }}>
        <Navbar />
        <Container maxWidth="lg" sx={{ py: 8 }}>
          <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
            Error loading plans: {plansError.message}
          </Alert>
        </Container>
        <Footer />
      </Box>
    );
  }

  return (
    <Box sx={{
      backgroundColor: "background.default",
      color: "text.primary",
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Navbar />

      {/* Hero Section */}
      <Box sx={{
        position: "relative",
        width: "100%",
        py: { xs: 8, md: 12 },
        background: theme =>
          theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #FAF9F6 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, #28282B 0%, #1e1e1e 100%)',
        overflow: "hidden",
      }}>
        <Box sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: theme => theme.palette.mode === 'light' ? `url(${DashboardImg6})` : `url(${DashboardImg4})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          opacity: theme => theme.palette.mode === 'light' ? 0.3 : 0.2,
          zIndex: 0,
        }} />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{
            textAlign: "center",
            maxWidth: 800,
            mx: "auto",
            mb: 10,
            px: { xs: 2, sm: 0 }
          }}>
            <Typography
              variant="h1"
              component="h1"
              sx={{
                fontWeight: 800,
                mb: 3,
                fontSize: { xs: "2.5rem", md: "3.5rem" },
                lineHeight: 1.2,
                letterSpacing: "-0.03em",
                color: theme => theme.palette.mode === 'light' ? '#424242' : '#E2DFD2',
              }}
            >
              Streamline HR Operations with Precision Task Management
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                mb: 6,
                fontSize: { xs: "1rem", md: "1.25rem" },
                fontWeight: 400,
                color: "text.secondary",
              }}
            >
              Assign, track, and verify tasks with our comprehensive HR management platform featuring automated screenshots and role-based controls.
            </Typography>

            <Box sx={{
              display: "flex",
              gap: 3,
              justifyContent: "center",
              flexWrap: "wrap"
            }}>
              <Button
                component={Link}
                to="/project"
                variant="contained"
                size="large"
                endIcon={<ArrowForwardIcon />}
                sx={{
                  px: 5,
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  boxShadow: theme => theme.palette.mode === 'light'
                    ? '0 4px 14px rgba(25, 118, 210, 0.3)'
                    : '0 4px 14px rgba(187, 134, 252, 0.3)',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    boxShadow: theme => theme.palette.mode === 'light'
                      ? '0 6px 16px rgba(25, 118, 210, 0.4)'
                      : '0 6px 16px rgba(187, 134, 252, 0.4)',
                  },
                }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' })}
                sx={{
                  px: 5,
                  py: 1.5,
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: "12px",
                  borderWidth: 2,
                  borderColor: 'primary.main',
                  color: 'primary.main',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: 'primary.dark',
                    color: 'primary.dark',
                    bgcolor: 'action.hover',
                  },
                }}
              >
                View Pricing
              </Button>
            </Box>
          </Box>

          {/* Hero Image */}
          <Box
            sx={{
              height: { xs: 300, md: 450 },
              bgcolor: "background.paper",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: theme => theme.palette.mode === 'light'
                ? '1px solid rgba(0, 0, 0, 0.12)'
                : '1px solid rgba(255, 255, 255, 0.12)',
              boxShadow: theme => theme.palette.mode === 'light'
                ? '0 8px 24px rgba(0, 0, 0, 0.08)'
                : '0 8px 24px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <img
              src={DashboardImg1}
              alt="dashboard preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Box sx={{
        py: { xs: 8, md: 12 },
        bgcolor: "background.subtle",
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                letterSpacing: "-0.025em",
                color: theme => theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
              }}
            >
              Core Features
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                maxWidth: 600,
                mx: "auto",
                color: "text.secondary"
              }}
            >
              Everything you need for efficient HR task management in one secure platform
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {FEATURES.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card
                    variant="outlined"
                    sx={{
                      height: "100%",
                      p: 3,
                      borderRadius: 3,
                      borderColor: "divider",
                      transition: "all 0.3s ease",
                      bgcolor: 'background.paper',
                      boxShadow: 'none',
                      "&:hover": {
                        transform: 'translateY(-4px)',
                        borderColor: "primary.main",
                        boxShadow: theme => theme.palette.mode === 'light'
                          ? '0 6px 20px rgba(0, 0, 0, 0.1)'
                          : '0 6px 20px rgba(0, 0, 0, 0.3)',
                      }
                    }}
                  >
                    <CardContent sx={{ p: 0, textAlign: 'center' }}>
                      <Box sx={{
                        mb: 3,
                        display: 'inline-flex',
                        p: 2,
                        borderRadius: '50%',
                        bgcolor: theme => theme.palette.mode === 'light'
                          ? 'rgba(25, 118, 210, 0.1)'
                          : 'rgba(187, 134, 252, 0.1)',
                      }}>
                        <IconComponent fontSize="large" color="primary" />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary", lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Grid container spacing={6} alignItems="center">
          <Grid item xs={12} md={6} order={{ xs: 2, md: 1 }}>
            <Box sx={{
              height: 400,
              bgcolor: "background.paper",
              borderRadius: 3,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid",
              borderColor: "divider",
              boxShadow: theme => theme.palette.mode === 'light'
                ? '0 8px 24px rgba(0, 0, 0, 0.08)'
                : '0 8px 24px rgba(0, 0, 0, 0.2)',
              overflow: 'hidden'
            }}>
              <img
                src={DashboardImg2}
                alt="dashboard preview"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>
          </Grid>
          <Grid item xs={12} md={6} order={{ xs: 1, md: 2 }} sx={{ pl: { md: 6 } }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                mb: 3,
                letterSpacing: "-0.025em",
                color: theme => theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
              }}
            >
              Designed for HR Professionals
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 4,
                color: "text.secondary",
                lineHeight: 1.7,
              }}
            >
              Our platform provides the tools HR teams need to maintain oversight while empowering employees with clear task expectations and accountability.
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {BENEFITS.map((benefit, index) => (
                <Box key={index} sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'background.subtle',
                }}>
                  <CheckCircleIcon color="primary" />
                  <Typography variant="body1" color="text.primary">
                    {benefit}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* Plans Section */}
      <Box id="plans-section" sx={{
        py: { xs: 8, md: 12 },
        bgcolor: 'background.subtle',
      }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: 8 }}>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 700,
                mb: 2,
                letterSpacing: "-0.025em",
                color: theme => theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
              }}
            >
              {currentSubscription?.data ? "Your Current Plan" : "Choose Your Plan"}
            </Typography>
            <Typography
              variant="subtitle1"
              sx={{
                maxWidth: 600,
                mx: "auto",
                color: "text.secondary"
              }}
            >
              {currentSubscription?.data ? "Manage your subscription and access premium features" : "Flexible pricing options to suit your organization's needs"}
            </Typography>
          </Box>

          {currentSubscription?.data ? (
            // Current subscription view
            <Grid container justifyContent="center">
              <Grid item xs={12} md={10}>
                <Card
                  variant="outlined"
                  sx={{
                    p: 4,
                    borderRadius: 3,
                    borderColor: "primary.main",
                    borderWidth: 2,
                    boxShadow: theme => theme.palette.mode === 'light'
                      ? '0 8px 24px rgba(25, 118, 210, 0.15)'
                      : '0 8px 24px rgba(187, 134, 252, 0.15)',
                  }}
                >
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={4}>
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      p: 3,
                      bgcolor: 'rgba(25, 118, 210, 0.05)',
                      borderRadius: 2,
                      minWidth: 200,
                    }}>
                      {getPlanIcon(currentSubscription.data.planId?.name)}
                      <Typography variant="h5" sx={{ mt: 2, fontWeight: 700 }}>
                        {currentSubscription.data.planId?.name}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
                        ${currentSubscription.data.planId?.price}
                        <Typography component="span" variant="body1" color="text.secondary">
                          /{currentSubscription.data.planId?.billingCycle}
                        </Typography>
                      </Typography>
                      {getStatusChip(currentSubscription.data.status)}
                    </Box>

                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                        Plan Details
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {currentSubscription.data.planId?.description}
                      </Typography>

                      <Box sx={{ mb: 3 }}>
                        {currentSubscription.data.planId?.features?.map((feature, index) => (
                          <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <CheckCircleIcon color="primary" sx={{ fontSize: '1rem', mr: 1 }} />
                            <Typography variant="body2">{feature}</Typography>
                          </Box>
                        ))}
                      </Box>

                      <Grid container spacing={2} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                          <Typography variant="body2" color="text.secondary">
                            Next Billing Date
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 500, mt: 1 }}>
                            {formatDate(currentSubscription.data.endDate)}
                          </Typography>
                        </Grid>
                        {currentSubscription.data.trialEndDate && (
                          <Grid item xs={12} md={6}>
                            <Typography variant="body2" color="text.secondary">
                              Trial Ends
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 500, mt: 1 }}>
                              {formatDate(currentSubscription.data.trialEndDate)}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>

                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button
                          variant="contained"
                          onClick={() => setChangePlanDialog(true)}
                          sx={{
                            borderRadius: '12px',
                            fontWeight: 600,
                            py: 1.5,
                            px: 4,
                            textTransform: 'none',
                          }}
                        >
                          Change Plan
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => setCancelDialog(true)}
                          disabled={currentSubscription.data.status === 'canceled'}
                          sx={{
                            borderRadius: '12px',
                            fontWeight: 600,
                            py: 1.5,
                            px: 4,
                            textTransform: 'none',
                          }}
                        >
                          Cancel Subscription
                        </Button>
                      </Box>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          ) : (
            // Plans selection view
            <Grid container spacing={4} justifyContent="center">
              {plansLoading ? (
                // Loading skeletons
                Array(3).fill(0).map((_, index) => (
                  <Grid item xs={12} sm={6} md={4} key={index}>
                    <PlanSkeleton />
                  </Grid>
                ))
              ) : (
                plans?.map((plan) => (
                  <Grid item xs={12} sm={6} md={4} key={plan._id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 3,
                        borderColor: plan.isPopular ? "primary.main" : "divider",
                        borderWidth: plan.isPopular ? 2 : 1,
                        boxShadow: plan.isPopular ? theme => theme.palette.mode === 'light'
                          ? '0 8px 24px rgba(25, 118, 210, 0.15)'
                          : '0 8px 24px rgba(187, 134, 252, 0.15)' : 'none',
                        transition: "all 0.3s ease",
                        "&:hover": {
                          transform: 'translateY(-4px)',
                          boxShadow: theme => theme.palette.mode === 'light'
                            ? '0 8px 24px rgba(0, 0, 0, 0.15)'
                            : '0 8px 24px rgba(0, 0, 0, 0.3)',
                        }
                      }}
                    >
                      {plan.isPopular && (
                        <Box sx={{
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          py: 1,
                          textAlign: 'center',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                        }}>
                          Most Popular
                        </Box>
                      )}
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Stack spacing={2}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {getPlanIcon(plan.name)}
                            <Typography
                              variant="h5"
                              component="h3"
                              sx={{
                                fontWeight: 700,
                                color: plan.isPopular ? 'primary.main' : 'text.primary',
                              }}
                            >
                              {plan.name}
                            </Typography>
                          </Box>

                          <Box>
                            <Typography variant="h4" sx={{ fontWeight: 800 }}>
                              ${plan.price}
                              <Typography component="span" variant="body1" color="text.secondary">
                                /{plan.billingCycle}
                              </Typography>
                            </Typography>
                            {plan.trialDays > 0 && (
                              <Typography variant="body2" color="success.main">
                                {plan.trialDays}-day free trial
                              </Typography>
                            )}
                          </Box>

                          <Divider />

                          <Typography variant="body2" color="text.secondary">
                            {plan.description}
                          </Typography>

                          <Box>
                            {plan?.features?.map((feature, index) => (
                              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <CheckCircleIcon color="primary" sx={{ fontSize: '1rem', mr: 1 }} />
                                <Typography variant="body2">{feature}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </Stack>
                      </CardContent>
                      <Box sx={{ p: 2 }}>
                        <Button
                          variant={plan.isPopular ? "contained" : "outlined"}
                          fullWidth
                          size="large"
                          onClick={() => handlePlanAction(plan._id)}
                          sx={{
                            borderRadius: '12px',
                            fontWeight: 600,
                            py: 1.5,
                            textTransform: 'none',
                          }}
                        >
                          {!user ? "Get Started" : (currentSubscription?.data ? "Change Plan" : "Get Started")}
                        </Button>
                      </Box>
                    </Card>
                  </Grid>
                ))
              )}
            </Grid>
          )}

          {/* Show available plans for upgrading/downgrading */}
          {currentSubscription?.data && (
            <Box sx={{ mt: 8 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 4, textAlign: 'center' }}>
                Available Plans
              </Typography>
              <Grid container spacing={3}>
                {plans?.map((plan) => (
                  <Grid item xs={12} sm={6} md={4} key={plan._id}>
                    <Card
                      variant="outlined"
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: 2,
                        opacity: isCurrentPlan(plan._id) ? 0.6 : 1,
                        borderColor: isCurrentPlan(plan._id) ? "success.main" : "divider",
                      }}
                    >
                      <CardContent sx={{ flexGrow: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                          {getPlanIcon(plan.name)}
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {plan.name}
                          </Typography>
                          {isCurrentPlan(plan._id) && (
                            <Chip label="Current" color="success" size="small" />
                          )}
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                          ${plan.price}
                          <Typography component="span" variant="body2" color="text.secondary">
                            /{plan.billingCycle}
                          </Typography>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {plan.description}
                        </Typography>
                      </CardContent>
                      <Box sx={{ p: 2 }}>
                        {isCurrentPlan(plan._id) ? (
                          <Button
                            variant="contained"
                            fullWidth
                            disabled
                            sx={{ borderRadius: '8px' }}
                          >
                            Current Plan
                          </Button>
                        ) : (
                          <Button
                            variant={canUpgradeTo(plan) ? "contained" : "outlined"}
                            fullWidth
                            onClick={() => {
                              setSelectedNewPlan(plan);
                              setChangePlanDialog(true);
                            }}
                            sx={{ borderRadius: '8px' }}
                          >
                            {canUpgradeTo(plan) ? "Upgrade" : "Downgrade"}
                          </Button>
                        )}
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Container>
      </Box>

      {/* Cancel Subscription Dialog */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to cancel your subscription? You will lose access to premium features
            at the end of your current billing period.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)}>Keep Subscription</Button>
          <Button
            onClick={handleCancelSubscription}
            color="error"
            variant="contained"
            disabled={cancelMutation.isLoading}
          >
            {cancelMutation.isLoading ? 'Canceling...' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Plan Dialog */}
      <Dialog open={changePlanDialog} onClose={() => setChangePlanDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Plan</DialogTitle>
        <DialogContent>
          {selectedNewPlan ? (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Switch to {selectedNewPlan.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {selectedNewPlan.description}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
                ${selectedNewPlan.price}/{selectedNewPlan.billingCycle}
              </Typography>
              <Alert severity="info" sx={{ mb: 2 }}>
                Your billing will be prorated for the plan change.
              </Alert>
            </Box>
          ) : (
            <Typography>
              Are you sure you want to change your plan? Your billing will be adjusted accordingly.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setChangePlanDialog(false);
            setSelectedNewPlan(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={handleChangePlan}
            variant="contained"
            disabled={changePlanMutation.isLoading}
          >
            {changePlanMutation.isLoading ? 'Changing...' : 'Change Plan'}
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

      <Footer />
    </Box>
  );
}