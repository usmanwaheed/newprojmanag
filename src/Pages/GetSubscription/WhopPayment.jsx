import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, Card, CardContent, Button, Grid,
    TextField, FormControlLabel, Checkbox, Alert, CircularProgress,
    Divider, Stack, Chip, RadioGroup, Radio, FormControl, FormLabel,
    useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { usePublicPlans } from '../../AdminWork/hooks/planHooks';
import { useCreateSubscription } from '../../AdminWork/hooks/subscriptionHook';
import { useAuth } from '../../context/AuthProvider';
import Navbar from '../Navbar';
import Footer from '../Footer';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import PaypalIcon from '@mui/icons-material/Payment';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Star as StarIcon,
    Business as BusinessIcon,
    Diamond as DiamondIcon,
} from "@mui/icons-material";
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

const WhopPayment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();

    const { data: plans = [], isLoading: plansLoading, error: plansError } = usePublicPlans();
    const createSubscriptionMutation = useCreateSubscription();

    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
    const [formData, setFormData] = useState({
        email: user?.email || '',
        firstName: '',
        lastName: '',
        phone: '',
        // Card details (if card selected)
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        // PayPal email (if PayPal selected)
        paypalEmail: '',
    });

    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        marketing: false
    });

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});

    const selectedPlan = plans.find(plan => plan._id === id);

    const paymentMethods = [
        {
            id: 'card',
            label: 'Credit/Debit Card',
            icon: <CreditCardIcon />,
            description: 'Visa, Mastercard, American Express'
        },
        {
            id: 'paypal',
            label: 'PayPal',
            icon: <PaypalIcon />,
            description: 'Pay with your PayPal account'
        },
        {
            id: 'apple-pay',
            label: 'Apple Pay',
            icon: <PhoneAndroidIcon />,
            description: 'Quick and secure payment'
        },
        {
            id: 'google-pay',
            label: 'Google Pay',
            icon: <AccountBalanceWalletIcon />,
            description: 'Fast checkout with Google'
        }
    ];

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

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const formatExpiryDate = (value) => {
        const v = value.replace(/\D/g, '');
        if (v.length >= 2) {
            return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
        }
        return v;
    };

    const handleInputChange = (field) => (event) => {
        let value = event.target.value;

        if (field === 'cardNumber') {
            value = formatCardNumber(value);
            if (value.replace(/\s/g, '').length > 16) return;
        } else if (field === 'expiryDate') {
            value = formatExpiryDate(value);
            if (value.length > 5) return;
        } else if (field === 'cvv') {
            value = value.replace(/\D/g, '');
            if (value.length > 4) return;
        }

        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleAgreementChange = (field) => (event) => {
        setAgreements(prev => ({
            ...prev,
            [field]: event.target.checked
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        // Common validations
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        }

        if (!formData.firstName.trim()) {
            newErrors.firstName = 'First name is required';
        }

        if (!formData.lastName.trim()) {
            newErrors.lastName = 'Last name is required';
        }

        // Payment method specific validations
        if (selectedPaymentMethod === 'card') {
            if (!formData.cardNumber || formData.cardNumber.replace(/\s/g, '').length < 13) {
                newErrors.cardNumber = 'Please enter a valid card number';
            }

            if (!formData.expiryDate || formData.expiryDate.length < 5) {
                newErrors.expiryDate = 'Please enter a valid expiry date';
            }

            if (!formData.cvv || formData.cvv.length < 3) {
                newErrors.cvv = 'Please enter a valid CVV';
            }
        } else if (selectedPaymentMethod === 'paypal') {
            if (!formData.paypalEmail.trim()) {
                newErrors.paypalEmail = 'PayPal email is required';
            }
        }

        if (!agreements.terms) {
            newErrors.terms = 'You must accept the Terms of Service';
        }

        if (!agreements.privacy) {
            newErrors.privacy = 'You must accept the Privacy Policy';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!validateForm()) return;

        setProcessing(true);

        try {
            // Simulate payment processing
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Create subscription
            await createSubscriptionMutation.mutateAsync({
                planId: selectedPlan._id,
                paymentMethod: 'whop',
                paymentDetails: {
                    method: selectedPaymentMethod,
                    email: formData.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName
                }
            });

            // Redirect to success page
            navigate('/payment/success');

        } catch (error) {
            console.error('Payment failed:', error);
            setErrors({ submit: error.response?.data?.message || 'Payment failed. Please try again.' });
        } finally {
            setProcessing(false);
        }
    };

    const calculateTotal = () => {
        if (!selectedPlan) return 0;
        const subtotal = selectedPlan.price;
        const tax = subtotal * 0.08; // 8% tax
        return subtotal + tax;
    };

    if (plansLoading) {
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

    if (plansError || !selectedPlan) {
        return (
            <Box sx={{ backgroundColor: "background.default", minHeight: '100vh' }}>
                <Navbar />
                <Container maxWidth="lg" sx={{ py: 8 }}>
                    <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
                        {plansError ? `Error loading plan: ${plansError.message}` : 'Plan not found'}
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
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate(`/payment-selection/${id}`)}
                        sx={{ mr: 2 }}
                    >
                        Back
                    </Button>
                    <Box>
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                            Complete Your Purchase
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Secure checkout powered by Whop
                        </Typography>
                    </Box>
                </Box>

                <Grid container spacing={4}>
                    {/* Payment Form */}
                    <Grid item xs={12} md={8}>
                        <Card variant="outlined" sx={{ borderRadius: 3 }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                                    <AccountBalanceWalletIcon sx={{ mr: 2, color: '#EC4899' }} />
                                    <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                        Payment Information
                                    </Typography>
                                </Box>

                                <form onSubmit={handleSubmit}>
                                    <Grid container spacing={3}>
                                        {/* Personal Information */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                                Personal Information
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="First Name"
                                                value={formData.firstName}
                                                onChange={handleInputChange('firstName')}
                                                error={!!errors.firstName}
                                                helperText={errors.firstName}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <TextField
                                                fullWidth
                                                label="Last Name"
                                                value={formData.lastName}
                                                onChange={handleInputChange('lastName')}
                                                error={!!errors.lastName}
                                                helperText={errors.lastName}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Email Address"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange('email')}
                                                error={!!errors.email}
                                                helperText={errors.email}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>

                                        <Grid item xs={12}>
                                            <TextField
                                                fullWidth
                                                label="Phone Number (Optional)"
                                                value={formData.phone}
                                                onChange={handleInputChange('phone')}
                                                placeholder="+1 (555) 123-4567"
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                            />
                                        </Grid>

                                        {/* Payment Method Selection */}
                                        <Grid item xs={12}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
                                                Payment Method
                                            </Typography>
                                            <FormControl component="fieldset" fullWidth>
                                                <RadioGroup
                                                    value={selectedPaymentMethod}
                                                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                                                >
                                                    {paymentMethods.map((method) => (
                                                        <Card
                                                            key={method.id}
                                                            variant="outlined"
                                                            sx={{
                                                                mb: 2,
                                                                borderColor: selectedPaymentMethod === method.id ? 'primary.main' : 'divider',
                                                                borderWidth: selectedPaymentMethod === method.id ? 2 : 1,
                                                                cursor: 'pointer',
                                                                transition: 'all 0.2s ease',
                                                                '&:hover': {
                                                                    borderColor: 'primary.main'
                                                                }
                                                            }}
                                                            onClick={() => setSelectedPaymentMethod(method.id)}
                                                        >
                                                            <CardContent sx={{ p: 2 }}>
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <FormControlLabel
                                                                        value={method.id}
                                                                        control={<Radio />}
                                                                        label=""
                                                                        sx={{ mr: 2 }}
                                                                    />
                                                                    <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                                                                        <Box sx={{ mr: 2, color: 'primary.main' }}>
                                                                            {method.icon}
                                                                        </Box>
                                                                        <Box>
                                                                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                                                                {method.label}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="text.secondary">
                                                                                {method.description}
                                                                            </Typography>
                                                                        </Box>
                                                                    </Box>
                                                                </Box>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </RadioGroup>
                                            </FormControl>
                                        </Grid>

                                        {/* Payment Method Specific Fields */}
                                        {selectedPaymentMethod === 'card' && (
                                            <>
                                                <Grid item xs={12}>
                                                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                                        Card Details
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={12}>
                                                    <TextField
                                                        fullWidth
                                                        label="Card Number"
                                                        value={formData.cardNumber}
                                                        onChange={handleInputChange('cardNumber')}
                                                        error={!!errors.cardNumber}
                                                        helperText={errors.cardNumber}
                                                        placeholder="1234 5678 9012 3456"
                                                        InputProps={{
                                                            startAdornment: (
                                                                <CreditCardIcon color="action" />
                                                            ),
                                                        }}
                                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="Expiry Date"
                                                        value={formData.expiryDate}
                                                        onChange={handleInputChange('expiryDate')}
                                                        error={!!errors.expiryDate}
                                                        helperText={errors.expiryDate}
                                                        placeholder="MM/YY"
                                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        fullWidth
                                                        label="CVV"
                                                        value={formData.cvv}
                                                        onChange={handleInputChange('cvv')}
                                                        error={!!errors.cvv}
                                                        helperText={errors.cvv}
                                                        placeholder="123"
                                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                                    />
                                                </Grid>
                                            </>
                                        )}

                                        {selectedPaymentMethod === 'paypal' && (
                                            <Grid item xs={12}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                                    PayPal Email
                                                </Typography>
                                                <TextField
                                                    fullWidth
                                                    label="PayPal Email Address"
                                                    type="email"
                                                    value={formData.paypalEmail}
                                                    onChange={handleInputChange('paypalEmail')}
                                                    error={!!errors.paypalEmail}
                                                    helperText={errors.paypalEmail}
                                                    placeholder="your@paypal.com"
                                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                                                />
                                            </Grid>
                                        )}

                                        {/* Agreements */}
                                        <Grid item xs={12}>
                                            <Box sx={{ mt: 3 }}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={agreements.terms}
                                                            onChange={handleAgreementChange('terms')}
                                                            color="primary"
                                                        />
                                                    }
                                                    label={
                                                        <Typography variant="body2">
                                                            I agree to the{' '}
                                                            <Typography component="span" color="primary.main" sx={{ cursor: 'pointer' }}>
                                                                Terms of Service
                                                            </Typography>
                                                        </Typography>
                                                    }
                                                />
                                                {errors.terms && (
                                                    <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                                        {errors.terms}
                                                    </Typography>
                                                )}
                                            </Box>

                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={agreements.privacy}
                                                        onChange={handleAgreementChange('privacy')}
                                                        color="primary"
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2">
                                                        I agree to the{' '}
                                                        <Typography component="span" color="primary.main" sx={{ cursor: 'pointer' }}>
                                                            Privacy Policy
                                                        </Typography>
                                                    </Typography>
                                                }
                                            />
                                            {errors.privacy && (
                                                <Typography variant="caption" color="error" sx={{ display: 'block', mt: 1 }}>
                                                    {errors.privacy}
                                                </Typography>
                                            )}

                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={agreements.marketing}
                                                        onChange={handleAgreementChange('marketing')}
                                                        color="primary"
                                                    />
                                                }
                                                label={
                                                    <Typography variant="body2">
                                                        I'd like to receive marketing emails and updates
                                                    </Typography>
                                                }
                                            />
                                        </Grid>

                                        {errors.submit && (
                                            <Grid item xs={12}>
                                                <Alert severity="error" sx={{ borderRadius: 2 }}>
                                                    {errors.submit}
                                                </Alert>
                                            </Grid>
                                        )}

                                        <Grid item xs={12}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                size="large"
                                                fullWidth
                                                disabled={processing}
                                                startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <LockIcon />}
                                                sx={{
                                                    py: 2,
                                                    borderRadius: 3,
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    textTransform: 'none',
                                                    mt: 2
                                                }}
                                            >
                                                {processing ? 'Processing Payment...' : `Pay $${calculateTotal().toFixed(2)}`}
                                            </Button>
                                        </Grid>
                                    </Grid>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Order Summary */}
                    <Grid item xs={12} md={4}>
                        <Card variant="outlined" sx={{ borderRadius: 3, position: 'sticky', top: 20 }}>
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                    Order Summary
                                </Typography>

                                {/* Plan Details */}
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                    {getPlanIcon(selectedPlan.name)}
                                    <Box sx={{ ml: 2 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                            {selectedPlan.name} Plan
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Billed {selectedPlan.billingCycle}
                                        </Typography>
                                    </Box>
                                </Box>

                                {selectedPlan.trialDays > 0 && (
                                    <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            🎉 {selectedPlan.trialDays}-day free trial included!
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            You won't be charged until {new Date(Date.now() + selectedPlan.trialDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                        </Typography>
                                    </Alert>
                                )}

                                <Box sx={{ mb: 3 }}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                                        Features Included:
                                    </Typography>
                                    {selectedPlan.features?.slice(0, 4).map((feature, index) => (
                                        <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <CheckCircleIcon color="primary" sx={{ fontSize: '1rem', mr: 1 }} />
                                            <Typography variant="body2">{feature}</Typography>
                                        </Box>
                                    ))}
                                    {selectedPlan.features?.length > 4 && (
                                        <Typography variant="caption" color="text.secondary">
                                            +{selectedPlan.features.length - 4} more features
                                        </Typography>
                                    )}
                                </Box>

                                <Divider sx={{ my: 3 }} />

                                {/* Pricing Breakdown */}
                                <Box sx={{ mb: 2 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Subtotal</Typography>
                                        <Typography variant="body2">${selectedPlan.price.toFixed(2)}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="body2">Tax (8%)</Typography>
                                        <Typography variant="body2">${(selectedPlan.price * 0.08).toFixed(2)}</Typography>
                                    </Box>
                                </Box>

                                <Divider sx={{ mb: 2 }} />

                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                        Total
                                    </Typography>
                                    <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                        ${calculateTotal().toFixed(2)}
                                    </Typography>
                                </Box>

                                {/* Security Notice */}
                                <Box sx={{
                                    p: 2,
                                    bgcolor: 'rgba(25, 118, 210, 0.05)',
                                    borderRadius: 2,
                                    border: '1px solid',
                                    borderColor: 'rgba(25, 118, 210, 0.2)'
                                }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <LockIcon color="primary" sx={{ fontSize: 16, mr: 1 }} />
                                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                            Secure Payment
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Your payment information is encrypted and secure. We never store your card details.
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Container>

            <Footer />
        </Box>
    );
};

export default WhopPayment;