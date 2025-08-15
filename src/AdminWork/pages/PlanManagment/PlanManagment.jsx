"use client"

import { useState } from "react"
import {
    Box, Paper, Typography,
    Grid, Card, CardContent,
    CardActions, Button, Switch,
    FormControlLabel, TextField, Dialog,
    DialogTitle, DialogContent, DialogActions,
    Chip, FormControl, InputLabel,
    Select, MenuItem, useTheme,
    alpha, CircularProgress, Alert,
    Snackbar, Divider, Stack,
    Container, Fade,
} from "@mui/material"
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Star as StarIcon,
    Check as CheckIcon,
    Schedule as ScheduleIcon,
    TrendingUp as TrendingUpIcon,
    Business as BusinessIcon,
    Person as PersonIcon,
    Diamond as DiamondIcon,
} from "@mui/icons-material"
import {
    useAdminPlans,
    useCreatePlan,
    useUpdatePlan,
    useDeletePlan,
    useTogglePlanStatus,
} from "../../hooks/planHooks"


const PlanManagement = () => {
    const theme = useTheme()

    // API hooks - now using the real ones
    const { data: plans = [], isLoading, error, refetch } = useAdminPlans()
    const { mutate: createPlanMutation, isPending: isCreating } = useCreatePlan()
    const { mutate: updatePlanMutation, isPending: isUpdating } = useUpdatePlan()
    const { mutate: deletePlanMutation, isPending: isDeleting } = useDeletePlan()
    const { mutate: toggleStatusMutation, isPending: isToggling } = useTogglePlanStatus()

    // State management
    const [selectedPlan, setSelectedPlan] = useState(null)
    const [planDialogOpen, setPlanDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
    const [planToDelete, setPlanToDelete] = useState(null)
    const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" })

    // Form state
    const [formData, setFormData] = useState({
        name: "basic",
        price: 0,
        billingCycle: "monthly",
        trialDays: 14,
        isPopular: false,
        isActive: true,
        features: [""],
        description: ""
    })

    const showSnackbar = (message, severity = "success") => {
        setSnackbar({ open: true, message, severity })
    }

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false })
    }

    const resetForm = () => {
        setFormData({
            name: "basic",
            price: 0,
            billingCycle: "monthly",
            trialDays: 14,
            isPopular: false,
            isActive: true,
            features: [""],
            description: "",
        })
    }

    const handleFeatureChange = (index, value) => {
        const newFeatures = [...formData.features]
        newFeatures[index] = value
        setFormData({ ...formData, features: newFeatures })
    }

    // Add handler to add a new feature field
    const addFeatureField = () => {
        setFormData({ ...formData, features: [...formData.features, ""] })
    }

    const removeFeatureField = (index) => {
        if (formData.features.length > 1) {
            const newFeatures = formData.features.filter((_, i) => i !== index)
            setFormData({ ...formData, features: newFeatures })
        }
    }

    const handleCreatePlan = () => {
        resetForm()
        setSelectedPlan(null)
        setIsEditing(false)
        setPlanDialogOpen(true)
    }

    const handleEditPlan = (plan) => {
        setFormData({
            name: plan.name,
            price: plan.price,
            billingCycle: plan.billingCycle,
            trialDays: plan.trialDays,
            isPopular: plan.isPopular,
            isActive: plan.isActive,
            features: plan.features || [""],
            description: plan.description || "",
        })
        setSelectedPlan(plan)
        setIsEditing(true)
        setPlanDialogOpen(true)
    }

    const handleSavePlan = () => {
        if (isEditing && selectedPlan) {
            updatePlanMutation(
                {
                    id: selectedPlan._id,
                    updatedData: formData,
                },
                {
                    onSuccess: () => {
                        showSnackbar("Plan updated successfully!")
                        setPlanDialogOpen(false)
                        refetch()
                    },
                    onError: (error) => {
                        showSnackbar(error?.response?.data?.message || "Failed to update plan", "error")
                    },
                }
            )
        } else {
            createPlanMutation(formData, {
                onSuccess: () => {
                    showSnackbar("Plan created successfully!")
                    setPlanDialogOpen(false)
                    refetch()
                },
                onError: (error) => {
                    showSnackbar(error?.response?.data?.message || "Failed to create plan", "error")
                },
            })
        }
    }

    const handleDeleteConfirm = (plan) => {
        setPlanToDelete(plan)
        setDeleteConfirmOpen(true)
    }

    const handleDeletePlan = () => {
        if (planToDelete) {
            deletePlanMutation(planToDelete._id, {
                onSuccess: () => {
                    showSnackbar("Plan deleted successfully!")
                    setDeleteConfirmOpen(false)
                    setPlanToDelete(null)
                    refetch()
                },
                onError: (error) => {
                    showSnackbar(error?.response?.data?.message || "Failed to delete plan", "error")
                },
            })
        }
    }

    const handleToggleStatus = (planId) => {
        toggleStatusMutation(planId, {
            onSuccess: () => {
                showSnackbar("Plan status updated successfully!")
                refetch()
            },
            onError: (error) => {
                showSnackbar(error?.response?.data?.message || "Failed to update plan status", "error")
            },
        })
    }

    const handleInputChange = (field, value) => {
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const getPlanDisplayName = (name) => {
        return name.charAt(0).toUpperCase() + name.slice(1)
    }

    const formatPrice = (price, billingCycle) => {
        const cycleMap = {
            monthly: "month",
            yearly: "year",
            weekly: "week",
        }
        return `$${price}/${cycleMap[billingCycle] || billingCycle}`
    }

    const getPlanIcon = (planName) => {
        switch (planName.toLowerCase()) {
            case "basic":
                return <PersonIcon sx={{ fontSize: 28 }} />
            case "professional":
                return <BusinessIcon sx={{ fontSize: 28 }} />
            case "enterprise":
                return <DiamondIcon sx={{ fontSize: 28 }} />
            default:
                return <PersonIcon sx={{ fontSize: 28 }} />
        }
    }

    if (isLoading) {
        return (
            <Container maxWidth="xl">
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "60vh",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    <CircularProgress size={48} sx={{ color: theme.palette.text.primary }} />
                    <Typography variant="h6" color="text.secondary">
                        Loading plans...
                    </Typography>
                </Box>
            </Container>
        )
    }

    if (error) {
        return (
            <Container maxWidth="xl">
                <Box sx={{ p: 4 }}>
                    <Alert
                        severity="error"
                        sx={{
                            borderRadius: 2,
                            "& .MuiAlert-icon": {
                                color: theme.palette.text.primary,
                            },
                        }}
                    >
                        Failed to load plans: {error?.message || "Unknown error"}
                    </Alert>
                </Box>
            </Container>
        )
    }

    return (
        <Container maxWidth="xl">
            <Box sx={{ py: 4 }}>
                {/* Header Section */}
                <Box
                    sx={{
                        mb: 6,
                        background: `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.8)} 0%, ${alpha(theme.palette.background.default, 0.9)} 100%)`,
                        borderRadius: 3,
                        p: 4,
                        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                    }}
                >
                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", sm: "center" }}
                        spacing={3}
                    >
                        <Box>
                            <Typography
                                variant="h3"
                                sx={{
                                    color: theme.palette.text.primary,
                                    fontWeight: 700,
                                    mb: 1,
                                    fontSize: { xs: "2rem", md: "2.5rem" },
                                }}
                            >
                                Plan Management
                            </Typography>
                            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 400 }}>
                                Create and manage subscription plans for your platform
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<AddIcon />}
                            onClick={handleCreatePlan}
                            disabled={isCreating}
                            sx={{
                                backgroundColor: theme.palette.text.primary,
                                color: theme.palette.background.default,
                                px: 4,
                                py: 1.5,
                                borderRadius: 2,
                                textTransform: "none",
                                fontSize: "1rem",
                                fontWeight: 600,
                                boxShadow: `0 4px 12px ${alpha(theme.palette.text.primary, 0.3)}`,
                                "&:hover": {
                                    backgroundColor: alpha(theme.palette.text.primary, 0.9),
                                    boxShadow: `0 6px 16px ${alpha(theme.palette.text.primary, 0.4)}`,
                                    transform: "translateY(-1px)",
                                },
                                transition: "all 0.2s ease-in-out",
                            }}
                        >
                            Create New Plan
                        </Button>
                    </Stack>
                </Box>

                {/* Stats Overview */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                                background: theme.palette.background.paper,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.text.primary, 0.1),
                                    }}
                                >
                                    <TrendingUpIcon sx={{ color: theme.palette.text.primary }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                        {plans.length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Plans
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                                background: theme.palette.background.paper,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.text.primary, 0.1),
                                    }}
                                >
                                    <CheckIcon sx={{ color: theme.palette.text.primary }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                        {plans.filter((p) => p.isActive).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Active Plans
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                                background: theme.palette.background.paper,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.text.primary, 0.1),
                                    }}
                                >
                                    <StarIcon sx={{ color: theme.palette.text.primary }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                        {plans.filter((p) => p.isPopular).length}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Popular Plans
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Paper
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                                background: theme.palette.background.paper,
                            }}
                        >
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <Box
                                    sx={{
                                        p: 1.5,
                                        borderRadius: 2,
                                        backgroundColor: alpha(theme.palette.text.primary, 0.1),
                                    }}
                                >
                                    <ScheduleIcon sx={{ color: theme.palette.text.primary }} />
                                </Box>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                        {Math.round(plans.reduce((acc, p) => acc + p.trialDays, 0) / plans.length) || 0}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Avg Trial Days
                                    </Typography>
                                </Box>
                            </Stack>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Subscription Plans */}
                <Paper
                    sx={{
                        borderRadius: 3,
                        overflow: "hidden",
                        border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                        background: theme.palette.background.paper,
                    }}
                >
                    <Box sx={{ p: 4, borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.1)}` }}>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                            Subscription Plans
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>
                            Manage your subscription tiers and pricing
                        </Typography>
                    </Box>

                    <Box sx={{ p: 4 }}>
                        <Grid container spacing={4}>
                            {plans.map((plan, index) => (
                                <Grid item xs={12} md={6} lg={4} key={plan._id}>
                                    <Fade in timeout={300 + index * 100}>
                                        <Card
                                            sx={{
                                                height: "100%",
                                                position: "relative",
                                                borderRadius: 3,
                                                border: plan.isPopular
                                                    ? `2px solid ${theme.palette.text.primary}`
                                                    : `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                                                opacity: plan.isActive ? 1 : 0.6,
                                                background: plan.isPopular
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette.text.primary, 0.05)} 0%, ${alpha(theme.palette.background.paper, 1)} 100%)`
                                                    : theme.palette.background.paper,
                                                transition: "all 0.3s ease-in-out",
                                                "&:hover": {
                                                    transform: "translateY(-4px)",
                                                    boxShadow: `0 12px 24px ${alpha(theme.palette.text.primary, 0.15)}`,
                                                },
                                            }}
                                        >
                                            {plan.isPopular && (
                                                <Box
                                                    sx={{
                                                        position: "absolute",
                                                        top: -1,
                                                        left: -1,
                                                        right: -1,
                                                        height: 4,
                                                        background: `linear-gradient(90deg, ${theme.palette.text.primary} 0%, ${alpha(theme.palette.text.primary, 0.7)} 100%)`,
                                                        borderRadius: "12px 12px 0 0",
                                                    }}
                                                />
                                            )}

                                            {plan.isPopular && (
                                                <Chip
                                                    label="Most Popular"
                                                    size="small"
                                                    icon={<StarIcon sx={{ fontSize: 16 }} />}
                                                    sx={{
                                                        position: "absolute",
                                                        top: 16,
                                                        right: 16,
                                                        zIndex: 1,
                                                        backgroundColor: theme.palette.text.primary,
                                                        color: theme.palette.background.default,
                                                        fontWeight: 600,
                                                        "& .MuiChip-icon": {
                                                            color: theme.palette.background.default,
                                                        },
                                                    }}
                                                />
                                            )}

                                            <CardContent sx={{ p: 3 }}>
                                                <Stack spacing={3}>
                                                    <Box>
                                                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                                                            <Box
                                                                sx={{
                                                                    p: 1.5,
                                                                    borderRadius: 2,
                                                                    backgroundColor: alpha(theme.palette.text.primary, 0.1),
                                                                }}
                                                            >
                                                                {getPlanIcon(plan.name)}
                                                            </Box>
                                                            <Box sx={{ flex: 1 }}>
                                                                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                                                    {getPlanDisplayName(plan.name)}
                                                                </Typography>
                                                            </Box>
                                                            <Switch
                                                                checked={plan.isActive}
                                                                onChange={() => handleToggleStatus(plan._id)}
                                                                disabled={isToggling}
                                                                sx={{
                                                                    "& .MuiSwitch-switchBase.Mui-checked": {
                                                                        color: theme.palette.text.primary,
                                                                    },
                                                                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                                        backgroundColor: theme.palette.text.primary,
                                                                    },
                                                                }}
                                                            />
                                                        </Stack>

                                                        <Stack direction="row" alignItems="baseline" spacing={1} sx={{ mb: 2 }}>
                                                            <Typography
                                                                variant="h3"
                                                                sx={{
                                                                    fontWeight: 800,
                                                                    color: theme.palette.text.primary,
                                                                    fontSize: "2.5rem",
                                                                }}
                                                            >
                                                                ${plan.price}
                                                            </Typography>
                                                            <Typography variant="h6" color="text.secondary">
                                                                /{plan.billingCycle === "monthly" ? "mo" : plan.billingCycle === "yearly" ? "yr" : "wk"}
                                                            </Typography>
                                                        </Stack>
                                                    </Box>

                                                    <Divider sx={{ borderColor: alpha(theme.palette.text.primary, 0.1) }} />

                                                    <Stack spacing={2}>
                                                        <Box
                                                            sx={{
                                                                display: "flex",
                                                                alignItems: "center",
                                                                gap: 1,
                                                                p: 2,
                                                                borderRadius: 2,
                                                                backgroundColor: alpha(theme.palette.text.primary, 0.05),
                                                            }}
                                                        >
                                                            <ScheduleIcon sx={{ fontSize: 18, color: theme.palette.text.secondary }} />
                                                            <Typography variant="body2" color="text.secondary">
                                                                <strong>{plan.trialDays} days</strong> free trial
                                                            </Typography>
                                                        </Box>

                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Billing Cycle
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                                                {getPlanDisplayName(plan.billingCycle)}
                                                            </Typography>
                                                        </Stack>

                                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                            <Typography variant="body2" color="text.secondary">
                                                                Created
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                                                                {new Date(plan.createdAt).toLocaleDateString()}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                </Stack>
                                            </CardContent>

                                            <CardActions sx={{ p: 3, pt: 0 }}>
                                                <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
                                                    <Button
                                                        variant="outlined"
                                                        size="medium"
                                                        startIcon={<EditIcon />}
                                                        onClick={() => handleEditPlan(plan)}
                                                        disabled={isUpdating}
                                                        sx={{
                                                            flex: 1,
                                                            borderColor: alpha(theme.palette.text.primary, 0.3),
                                                            color: theme.palette.text.primary,
                                                            borderRadius: 2,
                                                            textTransform: "none",
                                                            fontWeight: 600,
                                                            "&:hover": {
                                                                borderColor: theme.palette.text.primary,
                                                                backgroundColor: alpha(theme.palette.text.primary, 0.05),
                                                            },
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="outlined"
                                                        size="medium"
                                                        color="error"
                                                        startIcon={<DeleteIcon />}
                                                        onClick={() => handleDeleteConfirm(plan)}
                                                        disabled={isDeleting}
                                                        sx={{
                                                            borderRadius: 2,
                                                            textTransform: "none",
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        Delete
                                                    </Button>
                                                </Stack>
                                            </CardActions>
                                        </Card>
                                    </Fade>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Paper>

                {/* Create/Edit Plan Dialog */}
                <Dialog
                    open={planDialogOpen}
                    onClose={() => setPlanDialogOpen(false)}
                    maxWidth="sm"
                    fullWidth
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                        },
                    }}
                >
                    <DialogTitle
                        sx={{
                            pb: 1,
                            borderBottom: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                        }}
                    >
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            {isEditing ? "Edit Plan" : "Create New Plan"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {isEditing ? "Update plan details and settings" : "Configure your new subscription plan"}
                        </Typography>
                    </DialogTitle>

                    <DialogContent sx={{ pt: 3 }}>
                        <Stack spacing={3}>
                            <FormControl fullWidth>
                                <InputLabel>Plan Name</InputLabel>
                                <Select
                                    value={formData.name}
                                    label="Plan Name"
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="basic">Basic</MenuItem>
                                    <MenuItem value="professional">Professional</MenuItem>
                                    <MenuItem value="enterprise">Enterprise</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Price"
                                type="number"
                                value={formData.price}
                                onChange={(e) => handleInputChange("price", Number.parseFloat(e.target.value) || 0)}
                                inputProps={{ min: 0, step: 0.01 }}
                                fullWidth
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            />

                            <FormControl fullWidth>
                                <InputLabel>Billing Cycle</InputLabel>
                                <Select
                                    value={formData.billingCycle}
                                    label="Billing Cycle"
                                    onChange={(e) => handleInputChange("billingCycle", e.target.value)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    <MenuItem value="weekly">Weekly</MenuItem>
                                    <MenuItem value="monthly">Monthly</MenuItem>
                                    <MenuItem value="yearly">Yearly</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Trial Days"
                                type="number"
                                value={formData.trialDays}
                                onChange={(e) => handleInputChange("trialDays", Number.parseInt(e.target.value) || 0)}
                                inputProps={{ min: 0 }}
                                fullWidth
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            />

                            {/* Add Features Section */}
                            <Box>
                                <Typography variant="body1" sx={{ mb: 1, fontWeight: 500 }}>
                                    Features
                                </Typography>
                                <Stack spacing={2}>
                                    {formData.features.map((feature, index) => (
                                        <Box key={index} sx={{ display: 'flex', gap: 1 }}>
                                            <TextField
                                                value={feature}
                                                onChange={(e) => handleFeatureChange(index, e.target.value)}
                                                fullWidth
                                                placeholder={`Feature ${index + 1}`}
                                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                                            />
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => removeFeatureField(index)}
                                                disabled={formData.features.length <= 1}
                                                sx={{ minWidth: 40 }}
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </Button>
                                        </Box>
                                    ))}
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={addFeatureField}
                                        sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
                                    >
                                        Add Feature
                                    </Button>
                                </Stack>
                            </Box>

                            {/* Add Description Field */}
                            <TextField
                                label="Description"
                                value={formData.description}
                                onChange={(e) => handleInputChange("description", e.target.value)}
                                multiline
                                rows={4}
                                fullWidth
                                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2 } }}
                            />

                            <Stack spacing={2}>
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.isPopular}
                                            onChange={(e) => handleInputChange("isPopular", e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": {
                                                    color: theme.palette.text.primary,
                                                },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                    backgroundColor: theme.palette.text.primary,
                                                },
                                            }}
                                        />
                                    }
                                    label="Mark as Popular"
                                />
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={formData.isActive}
                                            onChange={(e) => handleInputChange("isActive", e.target.checked)}
                                            sx={{
                                                "& .MuiSwitch-switchBase.Mui-checked": {
                                                    color: theme.palette.text.primary,
                                                },
                                                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                                                    backgroundColor: theme.palette.text.primary,
                                                },
                                            }}
                                        />
                                    }
                                    label="Active"
                                />
                            </Stack>
                        </Stack>
                    </DialogContent>

                    <DialogActions sx={{ p: 3, pt: 2 }}>
                        <Button
                            onClick={() => setPlanDialogOpen(false)}
                            disabled={isCreating || isUpdating}
                            sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSavePlan}
                            variant="contained"
                            disabled={isCreating || isUpdating}
                            sx={{
                                backgroundColor: theme.palette.text.primary,
                                color: theme.palette.background.default,
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                                "&:hover": {
                                    backgroundColor: alpha(theme.palette.text.primary, 0.9),
                                },
                            }}
                        >
                            {isCreating || isUpdating ? (
                                <CircularProgress size={20} sx={{ color: theme.palette.background.default }} />
                            ) : isEditing ? (
                                "Update Plan"
                            ) : (
                                "Create Plan"
                            )}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog
                    open={deleteConfirmOpen}
                    onClose={() => setDeleteConfirmOpen(false)}
                    PaperProps={{
                        sx: {
                            borderRadius: 3,
                            border: `1px solid ${alpha(theme.palette.text.primary, 0.1)}`,
                        },
                    }}
                >
                    <DialogTitle sx={{ pb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 600 }}>
                            Confirm Delete
                        </Typography>
                    </DialogTitle>
                    <DialogContent>
                        <Typography>
                            Are you sure you want to delete the <strong>"{planToDelete?.name}"</strong> plan? This action cannot be
                            undone.
                        </Typography>
                    </DialogContent>
                    <DialogActions sx={{ p: 3, pt: 2 }}>
                        <Button
                            onClick={() => setDeleteConfirmOpen(false)}
                            disabled={isDeleting}
                            sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeletePlan}
                            color="error"
                            variant="contained"
                            disabled={isDeleting}
                            sx={{
                                borderRadius: 2,
                                textTransform: "none",
                                fontWeight: 600,
                                px: 3,
                            }}
                        >
                            {isDeleting ? <CircularProgress size={20} /> : "Delete"}
                        </Button>
                    </DialogActions>
                </Dialog>

                {/* Snackbar for notifications */}
                <Snackbar
                    open={snackbar.open}
                    autoHideDuration={4000}
                    onClose={handleCloseSnackbar}
                    anchorOrigin={{ vertical: "top", horizontal: "right" }}
                >
                    <Alert
                        onClose={handleCloseSnackbar}
                        severity={snackbar.severity}
                        sx={{
                            width: "100%",
                            borderRadius: 2,
                            fontWeight: 600,
                        }}
                    >
                        {snackbar.message}
                    </Alert>
                </Snackbar>
            </Box >
        </Container >
    )
}

export default PlanManagement