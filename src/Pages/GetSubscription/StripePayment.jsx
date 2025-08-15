import React, { useState, useEffect } from 'react';
import {
    Box, Container, Typography, Card, CardContent, Button, Grid,
    TextField, FormControlLabel, Checkbox, Alert, CircularProgress,
    Divider, Stack, Chip, InputAdornment, useTheme
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
    Elements,
    CardElement,
    useStripe,
    useElements
} from '@stripe/react-stripe-js';
import Navbar from '../Navbar';
import Footer from '../Footer';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import LockIcon from '@mui/icons-material/Lock';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import {
    Star as StarIcon,
    Business as BusinessIcon,
    Diamond as DiamondIcon,
} from "@mui/icons-material";
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import { usePublicPlans } from '../../AdminWork/hooks/planHooks';
import { useCreateSubscription, useConfirmSubscriptionPayment } from '../../AdminWork/hooks/subscriptionHook';
import { useAuth } from '../../context/AuthProvider';
import { RouteNames } from '../../Constants/route';

console.log("STRIPE_PUBLISHABLE_KEY:", import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY, {
    stripeAccount: undefined,
    locale: 'en',
    betas: [],
});

stripePromise.catch(err => {
    console.error('Stripe failed to initialize:', err);
});
console.log("stripePromise", stripePromise)

// Custom Stripe Card Element styling
const cardElementOptions = {
    style: {
        base: {
            fontSize: '16px',
            color: '#424770',
            '::placeholder': {
                color: '#aab7c4',
            },
            fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
            fontSmoothing: 'antialiased',
        },
        invalid: {
            color: '#9e2146',
        },
    },
    hidePostalCode: false,
};

// Payment Form Component (needs to be inside Elements provider)
const PaymentForm = ({ selectedPlan, onPaymentSuccess, onPaymentError }) => {
    const stripe = useStripe();
    const elements = useElements();
    const { user } = useAuth();
    const createSubscriptionMutation = useCreateSubscription();
    const confirmPaymentMutation = useConfirmSubscriptionPayment();

    const [formData, setFormData] = useState({
        email: user?.email || '',
        cardholderName: user?.name || user?.companyName || '',
        billingAddress: {
            line1: '',
            city: '',
            state: '',
            postal_code: '',
            country: 'US'
        }
    });

    const [agreements, setAgreements] = useState({
        terms: false,
        privacy: false,
        marketing: false
    });

    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const [cardComplete, setCardComplete] = useState(false);
    const [cardError, setCardError] = useState('');

    const handleInputChange = (field) => (event) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handleBillingAddressChange = (field) => (event) => {
        setFormData(prev => ({
            ...prev,
            billingAddress: {
                ...prev.billingAddress,
                [field]: event.target.value
            }
        }));
    };

    const handleAgreementChange = (field) => (event) => {
        setAgreements(prev => ({
            ...prev,
            [field]: event.target.checked
        }));
    };

    const handleCardChange = (event) => {
        setCardComplete(event.complete);
        setCardError(event.error ? event.error.message : '');
    };

    const validateForm = () => {
        const newErrors = {};

        if (!formData.cardholderName.trim()) {
            newErrors.cardholderName = 'Cardholder name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.billingAddress.line1.trim()) {
            newErrors.billingAddress = 'Billing address is required';
        }

        if (!cardComplete) {
            newErrors.card = 'Please enter complete card information';
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

        if (!stripe || !elements) {
            setErrors({ submit: 'Stripe is not loaded. Please refresh the page.' });
            return;
        }

        if (!validateForm()) {
            return;
        }

        setProcessing(true);
        setErrors({});

        try {
            // For trial plans or free plans, we might not need payment method
            let paymentMethodId = null;

            // Only create payment method if it's a paid plan or trial that will convert to paid
            if (selectedPlan.price > 0 || selectedPlan.trialDays > 0) {
                const cardElement = elements.getElement(CardElement);

                // Create payment method
                const { error: paymentMethodError, paymentMethod } = await stripe.createPaymentMethod({
                    type: 'card',
                    card: cardElement,
                    billing_details: {
                        name: formData.cardholderName,
                        email: formData.email,
                        address: {
                            line1: formData.billingAddress.line1,
                            city: formData.billingAddress.city,
                            state: formData.billingAddress.state,
                            postal_code: formData.billingAddress.postal_code,
                            country: formData.billingAddress.country,
                        },
                    },
                });

                if (paymentMethodError) {
                    throw new Error(paymentMethodError.message);
                }

                paymentMethodId = paymentMethod.id;
            }

            // Create subscription with payment method
            const subscriptionData = {
                planId: selectedPlan._id,
                paymentMethodId,
                customerDetails: {
                    name: formData.cardholderName,
                    email: formData.email,
                    billingAddress: formData.billingAddress,
                },
                agreementAccepted: {
                    terms: agreements.terms,
                    privacy: agreements.privacy,
                    marketing: agreements.marketing,
                    timestamp: new Date().toISOString()
                }
            };

            console.log('Creating subscription with data:', subscriptionData);

            const result = await createSubscriptionMutation.mutateAsync(subscriptionData);
            console.log('Subscription creation result:', result);

            // Handle different subscription creation results
            if (result.success) {
                const subscriptionResult = result.data;

                // Check if payment confirmation is required (3D Secure)
                if (subscriptionResult.status === 'requires_confirmation' && subscriptionResult.clientSecret) {
                    console.log('Payment requires confirmation');

                    // Confirm the payment
                    const { error: confirmError } = await stripe.confirmCardPayment(subscriptionResult.clientSecret);

                    if (confirmError) {
                        throw new Error(confirmError.message);
                    }

                    // Confirm payment on backend
                    const confirmResult = await confirmPaymentMutation.mutateAsync({
                        subscriptionId: subscriptionResult.subscriptionId,
                        paymentIntentId: subscriptionResult.clientSecret.split('_secret_')[0]
                    });

                    if (confirmResult.success) {
                        onPaymentSuccess({
                            subscription: confirmResult.data,
                            message: 'Payment confirmed! Subscription activated successfully.'
                        });
                    } else {
                        throw new Error(confirmResult.message || 'Payment confirmation failed');
                    }
                } else if (subscriptionResult.subscription || subscriptionResult.status === 'trial') {
                    // Trial subscription or immediate success
                    const subscription = subscriptionResult.subscription || subscriptionResult;
                    const isTrialPlan = selectedPlan.trialDays > 0;

                    onPaymentSuccess({
                        subscription: subscription,
                        message: isTrialPlan
                            ? `${selectedPlan.trialDays}-day free trial activated successfully!`
                            : 'Subscription activated successfully!'
                    });
                } else {
                    // Handle other success cases
                    onPaymentSuccess({
                        subscription: subscriptionResult,
                        message: 'Subscription created successfully!'
                    });
                }
            } else {
                throw new Error(result.message || 'Failed to create subscription');
            }

        } catch (error) {
            console.error('Payment/Subscription creation failed:', error);

            let errorMessage = 'An unexpected error occurred. Please try again.';

            // Handle different types of errors
            if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            } else if (error.message) {
                errorMessage = error.message;
            }

            // Handle specific Stripe errors
            if (error.type === 'card_error') {
                errorMessage = `Card Error: ${error.message}`;
            } else if (error.type === 'validation_error') {
                errorMessage = `Validation Error: ${error.message}`;
            }

            setErrors({ submit: errorMessage });
            onPaymentError(errorMessage);
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

    const isFreePlan = selectedPlan?.price === 0;
    const isTrialPlan = selectedPlan?.trialDays > 0;

    return (
        <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
                {/* Card Information - Only show for paid plans */}
                {!isFreePlan && (
                    <>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                                Card Details
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <Box sx={{
                                p: 2,
                                border: '1px solid',
                                borderColor: cardError ? 'error.main' : 'grey.300',
                                borderRadius: 2,
                                '&:hover': {
                                    borderColor: cardError ? 'error.main' : 'primary.main',
                                },
                                '&:focus-within': {
                                    borderColor: 'primary.main',
                                    borderWidth: 2,
                                },
                                minHeight: '44px', // Ensure minimum height
                                display: 'flex',
                                alignItems: 'center',
                                backgroundColor: 'background.paper' // Ensure visible background
                            }}>
                                <CardElement
                                    options={cardElementOptions}
                                    onChange={handleCardChange}
                                />
                            </Box>
                            {cardError && (
                                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                    {cardError}
                                </Typography>
                            )}
                            {errors.card && (
                                <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                    {errors.card}
                                </Typography>
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Cardholder Name"
                                value={formData.cardholderName}
                                onChange={handleInputChange('cardholderName')}
                                error={!!errors.cardholderName}
                                helperText={errors.cardholderName}
                                placeholder="John Doe"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Grid>
                    </>
                )}

                {/* Contact Information */}
                <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, mt: isFreePlan ? 0 : 2 }}>
                        Contact Information
                    </Typography>
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
                        placeholder="john@example.com"
                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                </Grid>

                {/* Billing Address - Only show for paid plans */}
                {!isFreePlan && (
                    <>
                        <Grid item xs={12}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, mt: 2 }}>
                                Billing Address
                            </Typography>
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Street Address"
                                value={formData.billingAddress.line1}
                                onChange={handleBillingAddressChange('line1')}
                                error={!!errors.billingAddress}
                                helperText={errors.billingAddress}
                                placeholder="123 Main Street"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="City"
                                value={formData.billingAddress.city}
                                onChange={handleBillingAddressChange('city')}
                                placeholder="New York"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="State"
                                value={formData.billingAddress.state}
                                onChange={handleBillingAddressChange('state')}
                                placeholder="NY"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Grid>

                        <Grid item xs={12} sm={3}>
                            <TextField
                                fullWidth
                                label="ZIP Code"
                                value={formData.billingAddress.postal_code}
                                onChange={handleBillingAddressChange('postal_code')}
                                placeholder="10001"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                            />
                        </Grid>
                    </>
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
                                    <Typography component="span" color="primary.main" sx={{ cursor: 'pointer', textDecoration: 'underline' }}>
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
                                <Typography component="span" color="primary.main" sx={{ cursor: 'pointer', textDecoration: 'underline' }}>
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
                                I'd like to receive marketing emails and updates (optional)
                            </Typography>
                        }
                    />
                </Grid>

                {/* Error Display */}
                {errors.submit && (
                    <Grid item xs={12}>
                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                            <Typography variant="body2">
                                <strong>Payment Failed:</strong> {errors.submit}
                            </Typography>
                        </Alert>
                    </Grid>
                )}

                {/* Submit Button */}
                <Grid item xs={12}>
                    <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        fullWidth
                        disabled={processing || (!stripe && !isFreePlan)}
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
                        {processing ? 'Processing...' :
                            isFreePlan ? 'Activate Free Plan' :
                                isTrialPlan ? `Start ${selectedPlan.trialDays}-Day Free Trial` :
                                    `Pay ${calculateTotal().toFixed(2)}`}
                    </Button>
                </Grid>

                {/* Development Mode Notice */}
                {process.env.NODE_ENV === 'development' && (
                    <Grid item xs={12}>
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            <Typography variant="body2">
                                <strong>Development Mode:</strong> This is a test environment.
                                {!isFreePlan && ' Use test card: 4242 4242 4242 4242'}
                            </Typography>
                        </Alert>
                    </Grid>
                )}
            </Grid>
        </form>
    );
};

// Main Component
const StripePayment = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const theme = useTheme();
    const { user } = useAuth();

    const { data: plans = [], isLoading: plansLoading, error: plansError } = usePublicPlans();
    const [paymentStatus, setPaymentStatus] = useState(null);

    // Find the selected plan
    const selectedPlan = plans.find(plan => plan._id === id);

    // Check if user is authorized (only companies can purchase subscriptions)
    useEffect(() => {
        if (user && user.role !== 'company') {
            navigate(`/${RouteNames.UNAUTOHRIZE}`, {
                state: {
                    message: 'Only companies can purchase subscriptions. Users inherit their company\'s plan.'
                }
            });
        }
    }, [user, navigate]);

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

    const handlePaymentSuccess = (result) => {
        console.log('Payment success:', result);
        setPaymentStatus({
            type: 'success',
            message: result.message,
            subscription: result.subscription
        });

        // Redirect to success page after a short delay
        setTimeout(() => {
            navigate('/subscription-success', {
                state: {
                    subscription: result.subscription,
                    plan: selectedPlan,
                    message: result.message
                }
            });
        }, 2000);
    };

    const handlePaymentError = (error) => {
        console.error('Payment error:', error);
        setPaymentStatus({
            type: 'error',
            message: error
        });

        // Auto-clear error after 10 seconds
        setTimeout(() => {
            setPaymentStatus(null);
        }, 10000);
    };

    const calculateTotal = () => {
        if (!selectedPlan) return 0;
        const subtotal = selectedPlan.price;
        const tax = subtotal * 0.08; // 8% tax
        return subtotal + tax;
    };

    // Loading state
    if (plansLoading) {
        return (
            <Box sx={{ backgroundColor: "background.default", minHeight: '100vh' }}>
                <Navbar />
                <Container maxWidth="lg" sx={{ py: 8 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                        <CircularProgress size={60} />
                        <Typography variant="h6" sx={{ ml: 2 }}>
                            Loading plan details...
                        </Typography>
                    </Box>
                </Container>
                <Footer />
            </Box>
        );
    }

    // Error state
    if (plansError || !selectedPlan) {
        return (
            <Box sx={{ backgroundColor: "background.default", minHeight: '100vh' }}>
                <Navbar />
                <Container maxWidth="lg" sx={{ py: 8 }}>
                    <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto', borderRadius: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                            {plansError ? 'Error Loading Plan' : 'Plan Not Found'}
                        </Typography>
                        <Typography variant="body2">
                            {plansError
                                ? `Failed to load plan details: ${plansError.message}`
                                : 'The requested subscription plan could not be found.'}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={() => navigate('/pricing')}
                            sx={{ mt: 2 }}
                        >
                            View All Plans
                        </Button>
                    </Alert>
                </Container>
                <Footer />
            </Box>
        );
    }

    const isFreePlan = selectedPlan.price === 0;
    const isTrialPlan = selectedPlan.trialDays > 0;

    return (
        <Elements stripe={stripePromise}>
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
                            Back to Plans
                        </Button>
                        <Box>
                            <Typography variant="h4" sx={{ fontWeight: 700 }}>
                                {isFreePlan ? 'Activate Free Plan' : 'Complete Your Purchase'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {isFreePlan
                                    ? 'Set up your free account'
                                    : 'Secure checkout powered by Stripe'}
                            </Typography>
                        </Box>
                    </Box>

                    {/* Payment Status Alert */}
                    {paymentStatus && (
                        <Alert
                            severity={paymentStatus.type}
                            sx={{ mb: 4, borderRadius: 2 }}
                            onClose={() => setPaymentStatus(null)}
                        >
                            <Typography variant="body2">
                                {paymentStatus.message}
                            </Typography>
                        </Alert>
                    )}

                    <Grid container spacing={4}>
                        {/* Payment Form */}
                        <Grid item xs={12} md={8}>
                            <Card variant="outlined" sx={{ borderRadius: 3, overflow: 'visible' }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                                        <CreditCardIcon sx={{ mr: 2, color: 'primary.main' }} />
                                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                                            {isFreePlan ? 'Account Information' : 'Payment Information'}
                                        </Typography>
                                    </Box>

                                    <PaymentForm
                                        selectedPlan={selectedPlan}
                                        onPaymentSuccess={handlePaymentSuccess}
                                        onPaymentError={handlePaymentError}
                                    />
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Order Summary */}
                        <Grid item xs={12} md={4}>
                            <Card variant="outlined" sx={{ borderRadius: 3, position: 'sticky', top: 20 }}>
                                <CardContent sx={{ p: 4 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
                                        Plan Summary
                                    </Typography>

                                    {/* Plan Details */}
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                        {getPlanIcon(selectedPlan.name)}
                                        <Box sx={{ ml: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                                                {selectedPlan.name} Plan
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {isFreePlan ? 'Free Forever' : `Billed ${selectedPlan.billingCycle}`}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {/* Trial Notice */}
                                    {isTrialPlan && (
                                        <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                🎉 {selectedPlan.trialDays}-day free trial included!
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                You won't be charged until {new Date(Date.now() + selectedPlan.trialDays * 24 * 60 * 60 * 1000).toLocaleDateString()}
                                            </Typography>
                                        </Alert>
                                    )}

                                    {/* Features */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                                            Features Included:
                                        </Typography>
                                        {selectedPlan.features?.slice(0, 5).map((feature, index) => (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <CheckCircleIcon color="primary" sx={{ fontSize: '1rem', mr: 1 }} />
                                                <Typography variant="body2">{feature}</Typography>
                                            </Box>
                                        ))}
                                        {selectedPlan.features?.length > 5 && (
                                            <Typography variant="caption" color="text.secondary">
                                                +{selectedPlan.features.length - 5} more features
                                            </Typography>
                                        )}
                                    </Box>

                                    <Divider sx={{ my: 3 }} />

                                    {/* Pricing Breakdown */}
                                    {!isFreePlan && (
                                        <Box sx={{ mb: 2 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                <Typography variant="body2">Subtotal</Typography>
                                                <Typography variant="body2">${selectedPlan.price.toFixed(2)}</Typography>
                                            </Box>
                                            {!isTrialPlan && (
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Typography variant="body2">Tax (8%)</Typography>
                                                    <Typography variant="body2">${(selectedPlan.price * 0.08).toFixed(2)}</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    )}

                                    {!isFreePlan && <Divider sx={{ mb: 2 }} />}

                                    {/* Total */}
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                            {isFreePlan ? 'Plan Cost' :
                                                isTrialPlan ? 'Today\'s Total' : 'Total'}
                                        </Typography>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                            {isFreePlan ? 'Free' :
                                                isTrialPlan ? '$0.00' : `${calculateTotal().toFixed(2)}`}
                                        </Typography>
                                    </Box>

                                    {isTrialPlan && (
                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                                            After trial: ${calculateTotal().toFixed(2)} {selectedPlan.billingCycle}
                                        </Typography>
                                    )}

                                    {/* Security Notice */}
                                    <Box sx={{
                                        p: 2,
                                        bgcolor: theme.palette.mode === 'dark'
                                            ? 'rgba(25, 118, 210, 0.1)'
                                            : 'rgba(25, 118, 210, 0.05)',
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'rgba(25, 118, 210, 0.2)'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                            <LockIcon color="primary" sx={{ fontSize: 16, mr: 1 }} />
                                            <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                                {isFreePlan ? 'Secure Registration' : 'Secure Payment'}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">
                                            {isFreePlan
                                                ? 'Your information is encrypted and secure.'
                                                : 'Your payment information is encrypted and secure. We never store your card details.'}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Container>

                <Footer />
            </Box>
        </Elements>
    );
};

export default StripePayment;