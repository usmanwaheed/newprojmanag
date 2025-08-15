import { AppBar, Toolbar, Typography, Button, Box, Container, IconButton, useTheme, useScrollTrigger, Slide, Stack, Avatar, Menu, MenuItem, Divider } from "@mui/material"
import { Link } from "react-router-dom"
import { useEffect, useState } from "react"
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import { useAuth } from "../context/AuthProvider";
import audioClick from "../assets/audio/click2.wav"
import { RouteNames } from "../Constants/route";
import { useLogout } from "../hooks/useAuth";

export default function Navbar() {
    const theme = useTheme()
    const { mode, toggleTheme, user, isAdmin, setAccessToken } = useAuth();
    const logoutMutation = useLogout();
    const [scrolled, setScrolled] = useState(false)
    const [hovered, setHovered] = useState(false)
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    // console.log("User data from Navbar", user)

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    const playSound = () => {
        const audio = new Audio(audioClick);
        audio.play();
    };

    const handleThemeToggle = () => {
        playSound();
        toggleTheme();
    };

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        playSound();
        logoutMutation.mutate(); // This will trigger the logout process
        handleClose();
    };

    return (
        <AppBar
            position="sticky"
            elevation={0}
            sx={{
                backdropFilter: 'blur(12px)',
                backgroundColor: hovered || scrolled
                    ? theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.85)'
                        : 'rgba(30, 30, 30, 0.85)'
                    : theme.palette.mode === 'light'
                        ? 'rgba(255, 255, 255, 0.7)'
                        : 'rgba(30, 30, 30, 0.7)',
                borderBottom: `1px solid ${theme.palette.divider}`,
                py: 0.5,
                transition: 'all 0.3s ease',
                zIndex: theme.zIndex.drawer + 1,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <Container maxWidth="lg">
                <Toolbar sx={{
                    justifyContent: "space-between",
                    minHeight: "64px !important",
                    px: { xs: 0, sm: 2 }
                }}>
                    <Typography
                        variant="h6"
                        component={Link}
                        to="/"
                        sx={{
                            color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                            fontWeight: 700,
                            fontSize: "1.25rem",
                            textDecoration: 'none',
                            letterSpacing: '-0.5px',
                            transition: 'color 0.3s ease',
                            '&:hover': {
                                color: 'primary.main',
                            }
                        }}
                    >
                        HR Managment
                    </Typography>

                    <Box sx={{
                        display: { xs: "none", md: "flex" },
                        gap: 1,
                        alignItems: "center"
                    }}>
                        {!user ? (
                            <>
                                <Button
                                    component={Link}
                                    to="#features"
                                    sx={{
                                        color: "text.secondary",
                                        textTransform: "none",
                                        px: 2,
                                        py: 1,
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        borderRadius: "8px",
                                        transition: 'all 0.2s ease',
                                        "&:hover": {
                                            backgroundColor: theme.palette.action.hover,
                                            color: "text.primary",
                                        },
                                    }}
                                >
                                    Features
                                </Button>
                                <Button
                                    component={Link}
                                    to="#pricing"
                                    sx={{
                                        color: "text.secondary",
                                        textTransform: "none",
                                        px: 2,
                                        py: 1,
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        borderRadius: "8px",
                                        transition: 'all 0.2s ease',
                                        "&:hover": {
                                            backgroundColor: theme.palette.action.hover,
                                            color: "text.primary",
                                        },
                                    }}
                                >
                                    Pricing
                                </Button>
                                <Button
                                    component={Link}
                                    to="#resources"
                                    sx={{
                                        color: "text.secondary",
                                        textTransform: "none",
                                        px: 2,
                                        py: 1,
                                        fontSize: "0.875rem",
                                        fontWeight: 500,
                                        borderRadius: "8px",
                                        transition: 'all 0.2s ease',
                                        "&:hover": {
                                            backgroundColor: theme.palette.action.hover,
                                            color: "text.primary",
                                        },
                                    }}
                                >
                                    Resources
                                </Button>
                            </>
                        ) : null}

                        <Box sx={{
                            display: "flex",
                            gap: 1.5,
                            ml: 2,
                            alignItems: 'center'
                        }}>


                            <Stack direction='row' spacing={2} alignItems='center' sx={{
                                '& svg': {
                                    cursor: 'pointer',
                                    fontSize: '1.8rem',
                                    color: theme.palette.text.primary
                                }
                            }}>
                                <IconButton onClick={handleThemeToggle} color="inherit">
                                    {mode === 'light' ? <DarkModeOutlinedIcon /> : <LightModeOutlinedIcon />}
                                </IconButton>
                            </Stack>


                            {user ? (
                                <>
                                    <Button
                                        component={Link}
                                        to={`/${RouteNames.PROJECT}`}
                                        variant="text"
                                        sx={{
                                            color: "text.secondary",
                                            textTransform: "none",
                                            px: 3,
                                            py: 1,
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                            borderRadius: "8px",
                                            transition: 'all 0.2s ease',
                                            "&:hover": {
                                                backgroundColor: theme.palette.action.hover,
                                                color: "text.primary",
                                            },
                                        }}
                                    >
                                        Dashboard
                                    </Button>

                                    <Box sx={{ display: 'flex', alignItems: 'center', }}>
                                        <IconButton
                                            onClick={handleClick}
                                            size="small"
                                            aria-controls={open ? 'account-menu' : undefined}
                                            aria-haspopup="true"
                                            aria-expanded={open ? 'true' : undefined}
                                        >
                                            <Avatar
                                                src={user.avatar}
                                                alt={user.name}
                                                sx={{ width: 32, height: 32 }}
                                            />
                                        </IconButton>
                                        <Typography variant="body2" sx={{ fontWeight: 500, color: theme.palette.text.secondary }}>
                                            {user.name}
                                        </Typography>
                                    </Box>

                                    <Menu
                                        anchorEl={anchorEl}
                                        id="account-menu"
                                        open={open}
                                        onClose={handleClose}
                                        onClick={handleClose}
                                        PaperProps={{
                                            elevation: 0,
                                            sx: {
                                                overflow: 'visible',
                                                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                                                mt: 1.5,
                                                '& .MuiAvatar-root': {
                                                    width: 32,
                                                    height: 32,
                                                    ml: -0.5,
                                                    mr: 1,
                                                },
                                                '&:before': {
                                                    content: '""',
                                                    display: 'block',
                                                    position: 'absolute',
                                                    top: 0,
                                                    right: 14,
                                                    width: 10,
                                                    height: 10,
                                                    bgcolor: 'background.paper',
                                                    transform: 'translateY(-50%) rotate(45deg)',
                                                    zIndex: 0,
                                                },
                                            },
                                        }}
                                        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                                        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                                    >
                                        <MenuItem onClick={handleClose} component={Link} to="/profile">
                                            <Avatar src={user.avatar} /> My Profile
                                        </MenuItem>
                                        <MenuItem onClick={handleClose} component={Link} to="/settings">
                                            Account Settings
                                        </MenuItem>
                                        <Divider />
                                        {isAdmin && (
                                            <MenuItem onClick={handleClose} component={Link} to="/admin/dashboard">
                                                Admin Dashboard
                                            </MenuItem>
                                        )}
                                        <MenuItem onClick={handleLogout}>
                                            Logout
                                        </MenuItem>
                                    </Menu>

                                </>
                            ) : (
                                <>
                                    <Button
                                        component={Link}
                                        to="/login"
                                        sx={{
                                            color: "text.secondary",
                                            textTransform: "none",
                                            px: 3,
                                            py: 1,
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                            borderRadius: "8px",
                                            transition: 'all 0.2s ease',
                                            "&:hover": {
                                                backgroundColor: theme.palette.action.hover,
                                                color: "text.primary",
                                            },
                                        }}
                                    >
                                        Sign In
                                    </Button>
                                    <Button
                                        component={Link}
                                        to="/project"
                                        variant="contained"
                                        sx={{
                                            backgroundColor: 'primary.main',
                                            color: 'primary.contrastText',
                                            textTransform: "none",
                                            px: 3,
                                            py: 1,
                                            fontSize: "0.875rem",
                                            fontWeight: 600,
                                            borderRadius: "8px",
                                            boxShadow: theme.palette.mode === 'light'
                                                ? '0 2px 8px rgba(25, 118, 210, 0.3)'
                                                : '0 2px 8px rgba(187, 134, 252, 0.3)',
                                            transition: 'all 0.2s ease',
                                            "&:hover": {
                                                backgroundColor: 'primary.dark',
                                                boxShadow: theme.palette.mode === 'light'
                                                    ? '0 4px 12px rgba(25, 118, 210, 0.4)'
                                                    : '0 4px 12px rgba(187, 134, 252, 0.4)',
                                                transform: 'translateY(-1px)',
                                            },
                                        }}
                                    >
                                        Get Started
                                    </Button>
                                </>
                            )}
                        </Box>

                    </Box>
                </Toolbar>
            </Container>
        </AppBar >
    )
}
