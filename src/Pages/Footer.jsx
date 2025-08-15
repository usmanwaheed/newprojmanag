import { Box, Container, Typography, Grid, Link, Divider, useTheme } from "@mui/material"

export default function Footer() {
    const theme = useTheme();

    return (
        <Box sx={{
            backgroundColor: theme.palette.background.subtle,
            borderTop: `1px solid ${theme.palette.divider}`,
            py: 8,
            transition: 'all 0.3s ease',
        }}>
            <Container maxWidth="lg">
                <Grid container spacing={4}>
                    <Grid item xs={12} md={4}>
                        <Typography
                            variant="h6"
                            component={Link}
                            href="/"
                            sx={{
                                fontWeight: 700,
                                mb: 3,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                                fontSize: "1.125rem",
                                textDecoration: 'none',
                                display: 'block',
                                '&:hover': {
                                    color: 'primary.main',
                                }
                            }}
                        >
                            TaskFlow Pro
                        </Typography>
                        <Typography
                            variant="body2"
                            sx={{
                                color: "text.secondary",
                                lineHeight: 1.7,
                                fontSize: "0.875rem",
                                maxWidth: "280px",
                            }}
                        >
                            Professional HR task management solution designed for modern teams and organizations.
                        </Typography>
                    </Grid>

                    <Grid item xs={6} sm={3} md={2}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                                fontSize: "0.875rem",
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Product
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {["Features", "Pricing", "Security", "API"].map((item) => (
                                <Link
                                    key={item}
                                    href="#"
                                    sx={{
                                        color: "text.secondary",
                                        textDecoration: "none",
                                        fontSize: "0.875rem",
                                        transition: 'color 0.2s ease',
                                        "&:hover": {
                                            color: "primary.main",
                                        },
                                    }}
                                >
                                    {item}
                                </Link>
                            ))}
                        </Box>
                    </Grid>

                    <Grid item xs={6} sm={3} md={2}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                                fontSize: "0.875rem",
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Company
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {["About", "Blog", "Careers", "Contact"].map((item) => (
                                <Link
                                    key={item}
                                    href="#"
                                    sx={{
                                        color: "text.secondary",
                                        textDecoration: "none",
                                        fontSize: "0.875rem",
                                        transition: 'color 0.2s ease',
                                        "&:hover": {
                                            color: "primary.main",
                                        },
                                    }}
                                >
                                    {item}
                                </Link>
                            ))}
                        </Box>
                    </Grid>

                    <Grid item xs={6} sm={3} md={2}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                                fontSize: "0.875rem",
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Resources
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {["Documentation", "Help Center", "Community", "Status"].map((item) => (
                                <Link
                                    key={item}
                                    href="#"
                                    sx={{
                                        color: "text.secondary",
                                        textDecoration: "none",
                                        fontSize: "0.875rem",
                                        transition: 'color 0.2s ease',
                                        "&:hover": {
                                            color: "primary.main",
                                        },
                                    }}
                                >
                                    {item}
                                </Link>
                            ))}
                        </Box>
                    </Grid>

                    <Grid item xs={6} sm={3} md={2}>
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                mb: 2,
                                color: theme.palette.mode === 'light' ? 'neutral.dark' : 'neutral.light',
                                fontSize: "0.875rem",
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                            }}
                        >
                            Legal
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                            {["Privacy", "Terms", "Security", "Compliance"].map((item) => (
                                <Link
                                    key={item}
                                    href="#"
                                    sx={{
                                        color: "text.secondary",
                                        textDecoration: "none",
                                        fontSize: "0.875rem",
                                        transition: 'color 0.2s ease',
                                        "&:hover": {
                                            color: "primary.main",
                                        },
                                    }}
                                >
                                    {item}
                                </Link>
                            ))}
                        </Box>
                    </Grid>
                </Grid>

                <Divider sx={{
                    my: 6,
                    borderColor: theme.palette.divider,
                    opacity: 0.5,
                }} />

                <Box
                    sx={{
                        display: "flex",
                        flexDirection: { xs: 'column-reverse', sm: 'row' },
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 3,
                    }}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            color: "text.secondary",
                            fontSize: "0.875rem",
                        }}
                    >
                        © {new Date().getFullYear()} TaskFlow Pro. All rights reserved.
                    </Typography>
                    <Box sx={{
                        display: "flex",
                        gap: 4,
                        flexWrap: 'wrap',
                        justifyContent: { xs: 'center', sm: 'flex-end' },
                    }}>
                        <Link
                            href="#"
                            sx={{
                                color: "text.secondary",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                                transition: 'color 0.2s ease',
                                "&:hover": {
                                    color: "primary.main",
                                },
                            }}
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="#"
                            sx={{
                                color: "text.secondary",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                                transition: 'color 0.2s ease',
                                "&:hover": {
                                    color: "primary.main",
                                },
                            }}
                        >
                            Terms of Service
                        </Link>
                        <Link
                            href="#"
                            sx={{
                                color: "text.secondary",
                                textDecoration: "none",
                                fontSize: "0.875rem",
                                transition: 'color 0.2s ease',
                                "&:hover": {
                                    color: "primary.main",
                                },
                            }}
                        >
                            Cookie Policy
                        </Link>
                    </Box>
                </Box>
            </Container>
        </Box>
    )
}