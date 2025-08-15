import React, { useState } from 'react';
import {
    Box, Container, Typography, Card, CardContent, Button, Grid,
    Divider, Stack, Chip, Alert, CircularProgress, useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from '../Footer';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SecurityIcon from '@mui/icons-material/Security';
import SpeedIcon from '@mui/icons-material/Speed';
import SupportIcon from '@mui/icons-material/Support';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
    Star as StarIcon,
    Business as BusinessIcon,
    Diamond as DiamondIcon,
} from "@mui/icons-material";
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { usePublicPlans } from '../../AdminWork/hooks/planHooks';
import { useAuth } from '../../context/AuthProvider';
import { RouteNames } from '../../Constants/route';

const PaymentSelection = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();
    const [selectedPayment, setSelectedPayment] = useState(null);
    const { data: plans = [], isLoading, error } = usePublicPlans();
    // const filteredPlan = plans.filter((plan) => plan._id)
    console.log("import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY", import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
    const filteredPlan = plans.find((e) => e._id)
    const selectedPlan = plans.find(plan => plan._id === id);

    const getPlanIcon = (planName) => {
        const iconProps = { sx: { fontSize: 48, color: 'primary.main' } };
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

    const handlePaymentSelection = (paymentType) => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (paymentType === 'stripe') {
            // navigate(`/payment/stripe/${id}`);
            // navigate(`/${RouteNames.PAYMENTSELECTION}/${RouteNames.STRIPE}/${id}`);
            navigate(`/${RouteNames.STRIPE}/${id}`);
        } else if (paymentType === 'whop') {
            // navigate(`/payment/whop/${id}`);
            navigate(`/${RouteNames.WHOP}/${id}`);
        }
    };

    if (isLoading) {
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
    if (error || !selectedPlan) {
        return (
            <Box sx={{ backgroundColor: "background.default", minHeight: '100vh' }}>
                <Navbar />
                <Container maxWidth="lg" sx={{ py: 8 }}>
                    <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
                        {error ? `Error loading plan: ${error.message}` : 'Plan not found'}
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

            <Container maxWidth="lg" sx={{ py: { xs: 4, md: 8 }, flexGrow: 1 }}>
                {/* Header */}
                <Box sx={{ textAlign: 'center', mb: 6 }}>
                    <Typography
                        variant="h3"
                        component="h1"
                        sx={{
                            fontWeight: 700,
                            mb: 2,
                            color: theme => theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                        }}
                    >
                        Choose Your Payment Method
                    </Typography>
                    <Typography
                        variant="subtitle1"
                        sx={{
                            color: "text.secondary",
                            maxWidth: 600,
                            mx: 'auto'
                        }}
                    >
                        Select your preferred payment provider to complete your subscription
                    </Typography>
                </Box>

                {/* Selected Plan Summary */}
                <Grid container spacing={4} sx={{ mb: 8 }}>
                    <Grid item xs={12} md={4}>
                        <Card
                            variant="outlined"
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                borderColor: 'primary.main',
                                borderWidth: 2,
                                bgcolor: 'background.paper',
                                textAlign: 'center'
                            }}
                        >
                            <Box sx={{ mb: 3 }}>
                                {getPlanIcon(selectedPlan.name)}
                            </Box>
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                                {selectedPlan.name} Plan
                            </Typography>
                            <Typography variant="h3" sx={{ fontWeight: 800, color: 'primary.main', mb: 2 }}>
                                ${selectedPlan.price}
                                <Typography component="span" variant="body1" color="text.secondary">
                                    /{selectedPlan.billingCycle}
                                </Typography>
                            </Typography>
                            {selectedPlan.trialDays > 0 && (
                                <Chip
                                    label={`${selectedPlan.trialDays}-day free trial`}
                                    color="success"
                                    sx={{ mb: 2 }}
                                />
                            )}
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                {selectedPlan.description}
                            </Typography>

                            <Divider sx={{ my: 2 }} />

                            <Box sx={{ textAlign: 'left' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                                    Included Features:
                                </Typography>
                                {selectedPlan.features?.map((feature, index) => (
                                    <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <CheckCircleIcon color="primary" sx={{ fontSize: '1rem', mr: 1 }} />
                                        <Typography variant="body2">{feature}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Typography variant="h4" sx={{ fontWeight: 600, mb: 4 }}>
                            Payment Options
                        </Typography>

                        <Grid container spacing={3}>
                            {/* Stripe Payment Option */}
                            <Grid item xs={12} md={6}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        height: '100%',
                                        borderRadius: 3,
                                        borderColor: selectedPayment === 'stripe' ? 'primary.main' : 'divider',
                                        borderWidth: selectedPayment === 'stripe' ? 2 : 1,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: theme => theme.palette.mode === 'light'
                                                ? '0 4px 12px rgba(25, 118, 210, 0.15)'
                                                : '0 4px 12px rgba(187, 134, 252, 0.15)',
                                        }
                                    }}
                                    onClick={() => setSelectedPayment('stripe')}
                                >
                                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                        <Box sx={{
                                            display: 'inline-flex',
                                            p: 2,
                                            borderRadius: '50%',
                                            bgcolor: 'rgba(103, 58, 183, 0.1)',
                                            mb: 3
                                        }}>
                                            <CreditCardIcon sx={{ fontSize: 40, color: '#6366F1' }} />
                                        </Box>

                                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                                            Stripe
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                            Secure card payments with industry-leading security
                                        </Typography>

                                        <Stack spacing={2} sx={{ mb: 4 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <SecurityIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Typography variant="body2">SSL Encrypted</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <SpeedIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Typography variant="body2">Instant Processing</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <SupportIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Typography variant="body2">24/7 Support</Typography>
                                            </Box>
                                        </Stack>

                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                                Accepted Cards:
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                                                {['Visa', 'Mastercard', 'Amex', 'Discover'].map((card) => (
                                                    <Chip key={card} label={card} size="small" variant="outlined" />
                                                ))}
                                            </Box>
                                        </Box>

                                        <Button
                                            variant={selectedPayment === 'stripe' ? 'contained' : 'outlined'}
                                            fullWidth
                                            size="large"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePaymentSelection('stripe');
                                            }}
                                            sx={{
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                                py: 1.5,
                                                textTransform: 'none',
                                            }}
                                        >
                                            Pay with Stripe
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* Whop Payment Option */}
                            <Grid item xs={12} md={6}>
                                <Card
                                    variant="outlined"
                                    sx={{
                                        height: '100%',
                                        borderRadius: 3,
                                        borderColor: selectedPayment === 'whop' ? 'primary.main' : 'divider',
                                        borderWidth: selectedPayment === 'whop' ? 2 : 1,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            boxShadow: theme => theme.palette.mode === 'light'
                                                ? '0 4px 12px rgba(25, 118, 210, 0.15)'
                                                : '0 4px 12px rgba(187, 134, 252, 0.15)',
                                        }
                                    }}
                                    onClick={() => setSelectedPayment('whop')}
                                >
                                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                        <Box sx={{
                                            display: 'inline-flex',
                                            p: 2,
                                            borderRadius: '50%',
                                            bgcolor: 'rgba(236, 72, 153, 0.1)',
                                            mb: 3
                                        }}>
                                            <AccountBalanceWalletIcon sx={{ fontSize: 40, color: '#EC4899' }} />
                                        </Box>

                                        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                                            Whop
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                            Modern payment platform with flexible options
                                        </Typography>

                                        <Stack spacing={2} sx={{ mb: 4 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <SecurityIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Typography variant="body2">Bank-level Security</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <SpeedIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Typography variant="body2">Quick Checkout</Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <SupportIcon color="primary" sx={{ fontSize: 20 }} />
                                                <Typography variant="body2">Dedicated Support</Typography>
                                            </Box>
                                        </Stack>

                                        <Box sx={{ mb: 3 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                                Payment Methods:
                                            </Typography>
                                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                                                {['Cards', 'PayPal', 'Apple Pay', 'Google Pay'].map((method) => (
                                                    <Chip key={method} label={method} size="small" variant="outlined" />
                                                ))}
                                            </Box>
                                        </Box>

                                        <Button
                                            variant={selectedPayment === 'whop' ? 'contained' : 'outlined'}
                                            fullWidth
                                            size="large"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePaymentSelection('whop');
                                            }}
                                            sx={{
                                                borderRadius: '12px',
                                                fontWeight: 600,
                                                py: 1.5,
                                                textTransform: 'none',
                                            }}
                                        >
                                            Pay with Whop
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>

                        {/* Payment Security Notice */}
                        <Alert
                            severity="info"
                            sx={{
                                mt: 4,
                                borderRadius: 2,
                                bgcolor: 'rgba(25, 118, 210, 0.05)',
                                borderColor: 'primary.main'
                            }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                🔒 Your payment information is secure
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Both payment providers use industry-standard encryption and security measures to protect your data.
                                You can cancel your subscription at any time.
                            </Typography>
                        </Alert>
                    </Grid>
                </Grid>

                {/* Back Button */}
                <Box sx={{ textAlign: 'center' }}>
                    <Button
                        variant="outlined"
                        size="large"
                        onClick={() => navigate('/')}
                        sx={{
                            borderRadius: '12px',
                            fontWeight: 600,
                            py: 1.5,
                            px: 4,
                            textTransform: 'none',
                        }}
                    >
                        Back to Plans
                    </Button>
                </Box>
            </Container>

            <Footer />
        </Box>
    );
};

export default PaymentSelection;