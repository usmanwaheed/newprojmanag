import React, { useState } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Divider,
    Grid,
    IconButton,
    Stack,
    Typography,
    useTheme,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    Snackbar,
    Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import {
    Diamond as DiamondIcon,
    CheckCircle as CheckCircleIcon,
    Star as StarIcon,
    Business as BusinessIcon,
} from "@mui/icons-material";
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useCreateSubscription, useCancelSubscription, useChangeSubscriptionPlan, useCurrentSubscription } from '../../AdminWork/hooks/subscriptionHook';
import { usePublicPlan, usePublicPlans } from '../../AdminWork/hooks/planHooks';
import { useAuth } from '../../context/AuthProvider';

export default function Subscription() {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();

    // State for dialogs and notifications
    const [cancelDialog, setCancelDialog] = useState(false);
    const [changePlanDialog, setChangePlanDialog] = useState(false);
    const [selectedNewPlan, setSelectedNewPlan] = useState(null);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    // Fetch the specific plan details
    const { data: plan, isLoading: planLoading, error: planError } = usePublicPlan(id);

    // Fetch all plans for comparison
    const { data: plans = [], isLoading: plansLoading, error: plansError } = usePublicPlans();

    // Fetch current subscription
    const { data: currentSubscription, refetch: refetchSubscription } = useCurrentSubscription();

    // Mutations
    const { mutate: createSubscription, isLoading: isSubscribing } = useCreateSubscription();
    const cancelMutation = useCancelSubscription();
    const changePlanMutation = useChangeSubscriptionPlan();

    // Helper functions
    const getPlanIcon = (planName) => {
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
    };

    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getStatusChip = (status) => {
        const statusConfig = {
            active: { color: 'success', label: 'Active' },
            trial: { color: 'info', label: 'Trial' },
            canceled: { color: 'error', label: 'Canceled' },
            expired: { color: 'warning', label: 'Expired' },
        };
        const config = statusConfig[status] || { color: 'default', label: status };
        return <Chip label={config.label} color={config.color} size="small" />;
    };

    const isCurrentPlan = (planId) => {
        return currentSubscription?.data?.planId?._id === planId;
    };

    const canUpgradeTo = (planToCheck) => {
        if (!currentSubscription?.data?.planId) return true;
        const currentPrice = currentSubscription.data.planId.price;
        return planToCheck.price > currentPrice;
    };

    const canDowngradeTo = (planToCheck) => {
        if (!currentSubscription?.data?.planId) return true;
        const currentPrice = currentSubscription.data.planId.price;
        return planToCheck.price < currentPrice;
    };

    // Handle subscription creation
    const handleSubscribe = () => {
        if (!plan) return;

        createSubscription(
            { planId: plan._id },
            {
                onSuccess: () => {
                    setSnackbar({
                        open: true,
                        message: 'Subscription created successfully!',
                        severity: 'success'
                    });
                    setTimeout(() => navigate('/home'), 2000);
                },
                onError: (error) => {
                    setSnackbar({
                        open: true,
                        message: error.response?.data?.message || 'Failed to create subscription',
                        severity: 'error'
                    });
                }
            }
        );
    };

    // Handle subscription cancellation
    const handleCancelSubscription = async () => {
        if (!currentSubscription?.data?._id) return;

        try {
            await cancelMutation.mutateAsync(currentSubscription.data._id);
            setSnackbar({
                open: true,
                message: 'Subscription canceled successfully',
                severity: 'success'
            });
            refetchSubscription();
            setCancelDialog(false);
        } catch (error) {
            setSnackbar({
                open: true,
                message: error.response?.data?.message || 'Failed to cancel subscription',
                severity: 'error'
            });
        }
    };

    // Handle plan change
    const handleChangePlan = async () => {
        if (!currentSubscription?.data?._id || !selectedNewPlan) return;

        try {
            await changePlanMutation.mutateAsync({
                id: currentSubscription.data._id,
                newPlanId: selectedNewPlan._id,
                reason: 'User requested plan change'
            });
            setSnackbar({
                open: true,
                message: 'Plan changed successfully',
                severity: 'success'
            });
            refetchSubscription();
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

    // Loading states
    if (planLoading || plansLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    // Error states
    if (planError || plansError) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
                    Error loading plan: {planError?.message || plansError?.message}
                </Alert>
            </Container>
        );
    }

    if (!plan) {
        return (
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto' }}>
                    Plan not found
                </Alert>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Stack spacing={4}>
                {/* Back button */}
                <Box>
                    <IconButton
                        component={Link}
                        to={'/home'}
                        sx={{ mb: 2 }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                </Box>

                {/* Current Subscription Status (if exists) */}
                {currentSubscription?.data && (
                    <Card
                        variant="outlined"
                        sx={{
                            borderRadius: 3,
                            borderColor: "info.main",
                            borderWidth: 1,
                            bgcolor: 'background.paper',
                            mb: 4
                        }}
                    >
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                                Current Subscription
                            </Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        {getPlanIcon(currentSubscription.data.planId?.name)}
                                        <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {currentSubscription.data.planId?.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ${currentSubscription.data.planId?.price}/{currentSubscription.data.planId?.billingCycle}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            Status: {getStatusChip(currentSubscription.data.status)}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Next billing: {formatDate(currentSubscription.data.endDate)}
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                                <Button
                                    variant="outlined"
                                    onClick={() => setChangePlanDialog(true)}
                                    size="small"
                                    sx={{ borderRadius: '8px' }}
                                >
                                    Change Plan
                                </Button>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    onClick={() => setCancelDialog(true)}
                                    disabled={currentSubscription.data.status === 'canceled'}
                                    size="small"
                                    sx={{ borderRadius: '8px' }}
                                >
                                    Cancel Subscription
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {/* Plan details card */}
                <Card
                    variant="outlined"
                    sx={{
                        borderRadius: 3,
                        borderColor: plan.isPopular ? "primary.main" : "divider",
                        borderWidth: plan.isPopular ? 2 : 1,
                        boxShadow: plan.isPopular
                            ? theme.palette.mode === 'light'
                                ? '0 8px 24px rgba(25, 118, 210, 0.15)'
                                : '0 8px 24px rgba(187, 134, 252, 0.15)'
                            : 'none',
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

                    <CardContent>
                        <Stack spacing={3}>
                            {/* Plan header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {getPlanIcon(plan.name)}
                                <Box>
                                    <Typography variant="h4" component="h1" fontWeight={700}>
                                        {plan.name}
                                    </Typography>
                                    <Typography color="text.secondary">
                                        {plan.description}
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Price section */}
                            <Box>
                                <Typography variant="h3" fontWeight={800}>
                                    ${plan.price}
                                    <Typography
                                        component="span"
                                        variant="h5"
                                        color="text.secondary"
                                        ml={1}
                                    >
                                        /{plan.billingCycle}
                                    </Typography>
                                </Typography>
                                {plan.trialDays > 0 && (
                                    <Typography color="success.main" sx={{ mt: 1 }}>
                                        {plan.trialDays}-day free trial
                                    </Typography>
                                )}
                            </Box>

                            <Divider />

                            {/* Features list */}
                            <Box>
                                <Typography variant="h6" fontWeight={600} mb={2}>
                                    What's included:
                                </Typography>
                                <Grid container spacing={2}>
                                    {plan.features?.map((feature, index) => (
                                        <Grid item xs={12} sm={6} key={index}>
                                            <Box display="flex" alignItems="center">
                                                <CheckCircleIcon color="primary" sx={{ mr: 1, fontSize: '1.2rem' }} />
                                                <Typography>{feature}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>

                            {/* Subscribe/Action buttons */}
                            <Box mt={4}>
                                {currentSubscription?.data ? (
                                    <>
                                        {isCurrentPlan(plan._id) ? (
                                            <Button
                                                variant="contained"
                                                size="large"
                                                fullWidth
                                                disabled
                                                sx={{
                                                    py: 2,
                                                    borderRadius: 2,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Current Plan
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="contained"
                                                size="large"
                                                fullWidth
                                                onClick={() => {
                                                    setSelectedNewPlan(plan);
                                                    setChangePlanDialog(true);
                                                }}
                                                sx={{
                                                    py: 2,
                                                    borderRadius: 2,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                {canUpgradeTo(plan) ? 'Upgrade to this Plan' : 'Downgrade to this Plan'}
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    <Button
                                        variant="contained"
                                        size="large"
                                        fullWidth
                                        onClick={handleSubscribe}
                                        disabled={isSubscribing}
                                        sx={{
                                            py: 2,
                                            borderRadius: 2,
                                            fontWeight: 600,
                                        }}
                                    >
                                        {isSubscribing ? 'Processing...' : 'Subscribe Now'}
                                    </Button>
                                )}
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Other Available Plans */}
                {plans.length > 1 && (
                    <Box>
                        <Typography variant="h5" fontWeight={600} mb={3}>
                            Other Available Plans
                        </Typography>
                        <Grid container spacing={3}>
                            {plans.filter(p => p._id !== plan._id).map((otherPlan) => (
                                <Grid item xs={12} sm={6} md={4} key={otherPlan._id}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            height: "100%",
                                            display: "flex",
                                            flexDirection: "column",
                                            borderRadius: 2,
                                            opacity: isCurrentPlan(otherPlan._id) ? 0.6 : 1,
                                            borderColor: isCurrentPlan(otherPlan._id) ? "success.main" : "divider",
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-2px)',
                                                boxShadow: theme.palette.mode === 'light'
                                                    ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                                                    : '0 4px 12px rgba(0, 0, 0, 0.3)',
                                            }
                                        }}
                                        onClick={() => navigate(`/subscription/${otherPlan._id}`)}
                                    >
                                        <CardContent sx={{ flexGrow: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                                {getPlanIcon(otherPlan.name)}
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                        {otherPlan.name}
                                                    </Typography>
                                                    {isCurrentPlan(otherPlan._id) && (
                                                        <Chip label="Current" color="success" size="small" />
                                                    )}
                                                </Box>
                                            </Box>
                                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                                ${otherPlan.price}
                                                <Typography component="span" variant="body2" color="text.secondary">
                                                    /{otherPlan.billingCycle}
                                                </Typography>
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {otherPlan.description}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                )}

                {/* Additional information */}
                <Box>
                    <Typography variant="h6" fontWeight={600} mb={2}>
                        Plan Details
                    </Typography>
                    <Typography color="text.secondary">
                        Your subscription will automatically renew at the end of each billing
                        cycle unless canceled. You can cancel anytime from your account settings.
                        {plan.trialDays > 0 && ' Your trial period will begin immediately after subscription.'}
                    </Typography>
                </Box>
            </Stack>

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
        </Container>
    );
}