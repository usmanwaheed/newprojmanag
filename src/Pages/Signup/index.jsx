import { useState } from 'react';
import { useSignup } from '../../hooks/useAuth';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { RouteNames } from '../../Constants/route';
import { toast } from 'react-toastify';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import {
    Box, Button,
    TextField, Typography,
    Container, CssBaseline,
    Avatar, Stack,
    RadioGroup,
    FormControlLabel,
    Radio,
    Fade,
    Paper,
    useTheme
} from '@mui/material';

const SignUpPage = () => {
    const theme = useTheme();
    const { mutate: signup } = useSignup();
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [redirect, setRedirect] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        companyName: '',
        // companySpecialKey: '',
        userCompanyKey: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        setError("");

        // Basic validation
        if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
            setError("All fields are required");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        // Role-specific validation
        // if (formData.role === 'company' && (!formData.companyName || !formData.companySpecialKey)) {
        if (formData.role === 'company' && (!formData.companyName)) {
            setError("Company name and special key are required for company registration");
            return;
        }

        if (formData.role === 'user' && !formData.userCompanyKey) {
            setError("Company special key is required for user registration");
            return;
        }

        setIsSubmitting(true);
        signup(formData, {
            onSuccess: (data) => {
                setIsSubmitting(false);
                setRedirect(true);
                toast.success("Registration successful!", {
                    position: "top-center",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: false,
                    draggable: true,
                    progress: false,
                    theme: theme.palette.mode,
                });
            },
            onError: (error) => {
                setIsSubmitting(false);
                setError(error?.response?.data?.error || error?.response?.data?.message || "Registration failed");
                setTimeout(() => {
                    setError("");
                }, 5000);
            }
        });
    }

    if (redirect) {
        return <Navigate to={`/${RouteNames.LOGIN}`} />;
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.palette.mode === 'light'
                ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
            position: 'relative',
            '&:before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backdropFilter: 'blur(8px)',
                zIndex: 0,
            }
        }}>
            <Container component="main" maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                <CssBaseline />
                <Fade in={true} timeout={800}>
                    <Paper elevation={10} sx={{
                        borderRadius: 4,
                        p: 4,
                        backdropFilter: 'blur(16px)',
                        backgroundColor: theme.palette.mode === 'light'
                            ? 'rgba(255, 255, 255, 0.8)'
                            : 'rgba(30, 30, 30, 0.8)',
                        border: `1px solid ${theme.palette.divider}`,
                        boxShadow: theme.shadows[10],
                    }}>
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            p: 3,
                        }}>
                            <Avatar sx={{
                                bgcolor: 'primary.main',
                                mb: 3,
                                width: 56,
                                height: 56,
                            }}>
                                <LockOutlinedIcon fontSize="medium" />
                            </Avatar>
                            <Typography variant="h5" component="h1" sx={{
                                fontWeight: 700,
                                mb: 1,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                            }}>
                                Create an Account
                            </Typography>
                            <Typography variant="body2" sx={{
                                mb: 4,
                                color: 'text.secondary',
                            }}>
                                Please fill in your details
                            </Typography>

                            <RadioGroup
                                aria-label="role"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                row
                                sx={{ mb: 3, width: '100%', justifyContent: 'center' }}
                            >
                                <FormControlLabel
                                    value="user"
                                    control={<Radio color="primary" />}
                                    label="User"
                                    sx={{
                                        '& .MuiTypography-root': {
                                            color: 'text.secondary',
                                            '&:hover': { color: 'text.primary' }
                                        }
                                    }}
                                />
                                <FormControlLabel
                                    value="company"
                                    control={<Radio color="primary" />}
                                    label="Company"
                                    sx={{
                                        '& .MuiTypography-root': {
                                            color: 'text.secondary',
                                            '&:hover': { color: 'text.primary' }
                                        }
                                    }}
                                />
                            </RadioGroup>

                            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                                <TextField
                                    margin="normal"
                                    size="medium"
                                    label="Full Name"
                                    name="name"
                                    autoFocus
                                    variant="outlined"
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    value={formData.name}
                                    sx={{ mb: 2 }}
                                    InputLabelProps={{
                                        sx: { color: 'text.secondary' }
                                    }}
                                />

                                <TextField
                                    margin="normal"
                                    size="medium"
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    variant="outlined"
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    value={formData.email}
                                    sx={{ mb: 2 }}
                                    InputLabelProps={{
                                        sx: { color: 'text.secondary' }
                                    }}
                                />

                                {/* Company-specific fields */}
                                {formData.role === 'company' && (
                                    <>
                                        <TextField
                                            margin="normal"
                                            size="medium"
                                            label="Company Name"
                                            name="companyName"
                                            variant="outlined"
                                            onChange={handleChange}
                                            fullWidth
                                            required
                                            value={formData.companyName}
                                            sx={{ mb: 2 }}
                                            InputLabelProps={{
                                                sx: { color: 'text.secondary' }
                                            }}
                                        />
                                    </>
                                )}

                                {/* User-specific fields */}
                                {formData.role === 'user' && (
                                    <TextField
                                        margin="normal"
                                        size="medium"
                                        label="Company Special Key"
                                        name="userCompanyKey"
                                        variant="outlined"
                                        onChange={handleChange}
                                        fullWidth
                                        required
                                        value={formData.userCompanyKey}
                                        sx={{ mb: 2 }}
                                        InputLabelProps={{
                                            sx: { color: 'text.secondary' }
                                        }}
                                        helperText="Enter the special key provided by your company"
                                    />
                                )}

                                <TextField
                                    margin="normal"
                                    size="medium"
                                    name="password"
                                    label="Password"
                                    type="password"
                                    variant="outlined"
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    value={formData.password}
                                    sx={{ mb: 2 }}
                                    InputLabelProps={{
                                        sx: { color: 'text.secondary' }
                                    }}
                                />

                                <TextField
                                    margin="normal"
                                    size="medium"
                                    name="confirmPassword"
                                    label="Confirm Password"
                                    type="password"
                                    variant="outlined"
                                    onChange={handleChange}
                                    fullWidth
                                    required
                                    value={formData.confirmPassword}
                                    sx={{ mb: 2 }}
                                    InputLabelProps={{
                                        sx: { color: 'text.secondary' }
                                    }}
                                />

                                {error && (
                                    <Typography sx={{
                                        color: 'error.main',
                                        textAlign: 'center',
                                        mb: 2,
                                        fontWeight: 500,
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
                                        mt: 3,
                                        mb: 2,
                                        py: 1.5,
                                        borderRadius: 2,
                                        fontSize: '1rem',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        boxShadow: theme.shadows[2],
                                        '&:hover': {
                                            boxShadow: theme.shadows[4],
                                            transform: 'translateY(-1px)',
                                        },
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    {isSubmitting ? 'Registering...' : 'Sign Up'}
                                </Button>

                                <Stack justifyContent="center" sx={{ mt: 2 }}>
                                    <Typography variant="body2" sx={{
                                        color: 'text.secondary',
                                        textAlign: 'center',
                                        '& a': {
                                            color: 'primary.main',
                                            textDecoration: 'none',
                                            '&:hover': {
                                                textDecoration: 'underline',
                                            }
                                        }
                                    }}>
                                        {"Already have an account?"}&nbsp;
                                        <Link to={`/${RouteNames.LOGIN}`}>
                                            Login here
                                        </Link>
                                    </Typography>
                                </Stack>
                            </Box>
                        </Box>
                    </Paper>
                </Fade>
            </Container>
        </Box>
    );
};

export default SignUpPage;