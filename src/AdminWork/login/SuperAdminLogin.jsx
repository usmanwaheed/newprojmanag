import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { RouteNames } from '../../Constants/route';
import { toast } from 'react-toastify';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import {
    Box, Button,
    TextField, Typography,
    Container, CssBaseline,
    Avatar, Stack,
    Fade,
    Paper,
    useTheme
} from '@mui/material';
import { useSuperAdminLogin } from '../../hooks/useSuperAdminAuth';

const SuperAdminLogin = () => {
    const theme = useTheme();
    const { mutate } = useSuperAdminLogin();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        mutate(formData, {
            onSuccess: () => {
                setIsSubmitting(false);
                const userRole = localStorage.getItem("roleAdmin");
                if (userRole === 'superadmin') {
                    navigate(`/${RouteNames.ADMINDASHBOARD}`);
                    toast.success("Authentication successful", {
                        position: "top-center",
                        autoClose: 2000,
                        hideProgressBar: true,
                        theme: theme.palette.mode,
                    });
                    // console.log("Success", userRole)
                }
            },
            onError: (error) => {
                setIsSubmitting(false);
                setError(error?.response?.data?.message || error.response?.data?.errors);
                setTimeout(() => {
                    setError("");
                }, 5000);
            }
        });
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.background.default,
        }}>
            <Container component="main" maxWidth="xs">
                <CssBaseline />
                <Fade in={true} timeout={500}>
                    <Paper elevation={3} sx={{
                        p: 4,
                        borderRadius: 2,
                        border: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper,
                    }}>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                        }}>
                            <Avatar sx={{
                                bgcolor: 'transparent',
                                mb: 3,
                                width: 60,
                                height: 60,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                                border: `2px solid ${theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light'}`,
                            }}>
                                <AdminPanelSettingsIcon fontSize="large" />
                            </Avatar>
                            <Typography variant="h5" component="h1" sx={{
                                fontWeight: 500,
                                mb: 1,
                                letterSpacing: '0.5px',
                            }}>
                                System Administration
                            </Typography>
                            <Typography variant="body2" sx={{
                                mb: 4,
                                color: 'text.secondary',
                            }}>
                                Restricted access portal
                            </Typography>

                            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                                <TextField
                                    margin="normal"
                                    size="medium"
                                    label="Administrator email"
                                    name="email"
                                    autoFocus
                                    variant="outlined"
                                    onChange={handleChange}
                                    fullWidth
                                    value={formData.email}
                                    sx={{ mb: 2 }}
                                    InputProps={{
                                        sx: {
                                            borderRadius: 1,
                                        }
                                    }}
                                />

                                <TextField
                                    margin="normal"
                                    size="medium"
                                    name="password"
                                    label="Access key"
                                    type="password"
                                    variant="outlined"
                                    onChange={handleChange}
                                    fullWidth
                                    value={formData.password}
                                    sx={{ mb: 2 }}
                                    InputProps={{
                                        sx: {
                                            borderRadius: 1,
                                        }
                                    }}
                                />

                                {error && (
                                    <Typography sx={{
                                        color: 'error.main',
                                        textAlign: 'center',
                                        mb: 2,
                                        fontSize: '0.875rem',
                                    }}>
                                        {error}
                                    </Typography>
                                )}

                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    disabled={isSubmitting}
                                    sx={{
                                        mt: 2,
                                        mb: 3,
                                        py: 1.5,
                                        borderRadius: 1,
                                        fontSize: '0.9375rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        letterSpacing: '0.5px',
                                        '&:hover': {
                                            backgroundColor: 'primary.dark',
                                        },
                                    }}
                                >
                                    {isSubmitting ? 'Verifying credentials...' : 'Authenticate'}
                                </Button>

                                <Typography variant="caption" sx={{
                                    display: 'block',
                                    color: 'text.secondary',
                                    textAlign: 'center',
                                    fontSize: '0.75rem',
                                    mt: 2,
                                }}>
                                    Unauthorized access prohibited
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    );
};

export default SuperAdminLogin;