import React from 'react';
import { Box, Container, Typography, Button, useTheme } from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../Navbar';
import Footer from '../Footer';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const Unauthorized = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();

    // Get the message passed from the navigation state or use a default one
    const message = location.state?.message ||
        'Only company accounts can access subscription plans. Users inherit their company\'s plan.';

    return (
        <Box sx={{
            backgroundColor: "background.default",
            color: "text.primary",
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column'
        }}>
            <Navbar />

            <Container maxWidth="md" sx={{
                py: 8,
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
            }}>
                <Box sx={{
                    p: 4,
                    borderRadius: 3,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(255, 0, 0, 0.1)'
                        : 'rgba(255, 0, 0, 0.05)',
                    border: '1px solid',
                    borderColor: 'error.main',
                    maxWidth: 600,
                    width: '100%'
                }}>
                    <ErrorOutlineIcon
                        color="error"
                        sx={{
                            fontSize: 60,
                            mb: 3
                        }}
                    />

                    <Typography variant="h4" sx={{
                        fontWeight: 700,
                        mb: 2,
                        color: 'error.main'
                    }}>
                        Access Restricted
                    </Typography>

                    <Typography variant="body1" sx={{ mb: 3 }}>
                        {message}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                        If you believe this is an error, please contact your administrator or support team.
                    </Typography>

                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate('/home')}
                        sx={{
                            px: 4,
                            py: 1.5,
                            borderRadius: 2,
                            fontSize: '1rem',
                            fontWeight: 600
                        }}
                    >
                        Go Back to Home
                    </Button>
                </Box>
            </Container>

            <Footer />
        </Box>
    );
};

export default Unauthorized;