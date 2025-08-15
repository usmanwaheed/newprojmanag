import React from 'react';
import {
    Box,
    Container,
    Typography,
    Button,
    Card,
    CardContent,
    Divider,
    Stack,
    useTheme
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import Navbar from '../Navbar';
import Footer from '../Footer';
import { RouteNames } from '../../Constants/route';

const PaymentSuccess = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    // Get the plan details from navigation state if available
    const plan = location.state?.plan || {};
    const paymentMethod = location.state?.paymentMethod || 'Whop';

    return (
        <Box sx={{
            backgroundColor: "background.default",
            color: "text.primary",
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Navbar />

            <Container maxWidth="md" sx={{ py: 8, flexGrow: 1, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ width: '100%' }}>
                    <Card variant="outlined" sx={{ borderRadius: 3, boxShadow: theme.shadows[3] }}>
                        <CardContent sx={{ p: 6, textAlign: 'center' }}>
                            {/* Success Icon */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
                                <CheckCircleIcon sx={{
                                    fontSize: 80,
                                    color: 'success.main',
                                    bgcolor: 'rgba(46, 125, 50, 0.1)',
                                    borderRadius: '50%',
                                    p: 1
                                }} />
                            </Box>

                            {/* Success Title */}
                            <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
                                Payment Successful!
                            </Typography>

                            {/* Success Message */}
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 500, mx: 'auto' }}>
                                Thank you for your purchase! Your payment has been processed successfully and your subscription is now active.
                            </Typography>

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<HomeIcon />}
                                onClick={() => navigate(`/${RouteNames.HOME}`)}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: 3,
                                    fontSize: '1rem',
                                    fontWeight: 600,
                                    textTransform: 'none',
                                }}
                            >
                                Go Back to Home
                            </Button>

                            {/* Additional Help */}
                            <Typography variant="caption" color="text.secondary" sx={{
                                display: 'block',
                                mt: 4,
                                '& a': {
                                    color: 'primary.main',
                                    textDecoration: 'none',
                                    '&:hover': {
                                        textDecoration: 'underline'
                                    }
                                }
                            }}>
                                Need help? <a href="/contact">Contact our support team</a>
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>
            </Container>

            <Footer />
        </Box>
    );
};

export default PaymentSuccess;