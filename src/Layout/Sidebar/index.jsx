import React, { useState, useRef } from 'react';
import styles from './page.module.scss';
import logoimage from '../../assets/Hide-sidebar.svg';
import { RouteNames } from '../../Constants/route';
import { drawerWidth } from '../../Constants/app';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material';
// import { useUpdateCompanyLogo } from '../../hooks/useHook'; // Import the logo update hook
import { useAuth } from '../../context/AuthProvider';

import DashboardIcon from '../../assets/dashboard.svg';
import ProjectsIcon from '../../assets/Project.svg';
import ClientsIcon from '../../assets/Client.svg';
import TeamsIcon from '../../assets/Team.svg';
// import MessagesIcon from '../../assets/Message.png';
import MeetingsIcon from '../../assets/Meetings.svg';
// import ReferralsIcon from '../../assets/Referrals.svg';
// import ServicesIcon from '../../assets/Services.svg';
// import ContractsIcon from '../../assets/Contracts.svg';
// import InvoicesIcon from '../../assets/Invoices.svg';
// import FormsIcon from '../../assets/Forms.svg';
// import FinancesIcon from '../../assets/finances.svg';

import DashboardIconWhite from '../../assets/Dashboard active.svg';
import ProjectsIconWhite from '../../assets/Project active.svg';
import ClientsIconWhite from '../../assets/Client active.svg';
import TeamsIconWhite from '../../assets/Team active.svg';
// import MessagesIconWhite from '../../assets/Message active.svg';
import MeetingsIconWhite from '../../assets/Meetings active.svg';
// import ReferralsIconWhite from '../../assets/Referrals active.svg';
// import ServicesIconWhite from '../../assets/Services active.svg';
// import ContractsIconWhite from '../../assets/Contracts active.svg';
// import InvoicesIconWhite from '../../assets/Invoices acitve.svg';
// import FormsIconWhite from '../../assets/Forms active.svg';
// import FinancesIconWhite from '../../assets/Finances active.svg';


import { useUpdateCompanyLogo } from '../../hooks/useAuth';

const Sidebar = () => {
    const { theme, mode, user, setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const currentPath = location.pathname;
    const companyId = user?.companySpecialKey;
    const companyRole = user?.role;
    const companyLogo = user?.companyId?.companyLogo

    const [logo, setLogo] = useState(user?.companyLogo || companyLogo);
    const fileInputRef = useRef(null);
    const { mutate: updateLogo, isLoading: isUpdatingLogo } = useUpdateCompanyLogo();

    const pages = [
        { name: 'Department', path: `/${RouteNames.DASHBOARD}`, Icon: DashboardIcon, ActiveIcon: DashboardIconWhite },
        { name: 'Projects', path: `/${RouteNames.PROJECT}`, Icon: ProjectsIcon, ActiveIcon: ProjectsIconWhite },
        { name: 'SOP\'s', path: `/${RouteNames.CLIENT}`, Icon: ClientsIcon, ActiveIcon: ClientsIconWhite },
        { name: 'Manage', path: `/${RouteNames.TEAMS}`, Icon: TeamsIcon, ActiveIcon: TeamsIconWhite },
        // { name: 'Messages', path: `/${RouteNames.MESSAGE}`, Icon: MessagesIcon, ActiveIcon: MessagesIconWhite },
        { name: 'Notifications', path: `/${RouteNames.MEETINGS}`, Icon: MeetingsIcon, ActiveIcon: MeetingsIconWhite },
        // { name: 'Referrals', path: `/${RouteNames.REFERRALS}`, Icon: ReferralsIcon, ActiveIcon: ReferralsIconWhite },
        // { name: 'Services', path: `/${RouteNames.SERVICES}`, Icon: ServicesIcon, ActiveIcon: ServicesIconWhite },
        // { name: 'Contracts', path: `/${RouteNames.CONTRACTS}`, Icon: ContractsIcon, ActiveIcon: ContractsIconWhite },
        // { name: 'Invoices', path: `/${RouteNames.INVOICES}`, Icon: InvoicesIcon, ActiveIcon: InvoicesIconWhite },
        // { name: 'Forms', path: `/${RouteNames.FORMS}`, Icon: FormsIcon, ActiveIcon: FormsIconWhite },
        // { name: 'Finances', path: `/${RouteNames.FINANCES}`, Icon: FinancesIcon, ActiveIcon: FinancesIconWhite },
    ];

    const handleClick = (path) => {
        navigate(path);
    };

    // Handle logo click to trigger file input
    const handleLogoClick = () => {
        if (companyRole === 'company') {
            fileInputRef.current.click();
        }
    };

    // Handle file selection and upload
    const handleLogoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Create a temporary URL for preview
        const tempUrl = URL.createObjectURL(file);
        setLogo(tempUrl);

        try {
            // Upload the new logo
            const response = await updateLogo(file);

            // Update the logo in state if upload was successful
            if (response?.data?.companyLogo) {
                setLogo(response.data.companyLogo);
                // Update user in context/auth if needed
                setUser(prev => ({ ...prev, companyLogo: response.data.companyLogo }));
            }
        } catch (error) {
            console.error('Error updating logo:', error);
            // Revert to previous logo if upload fails
            setLogo(user?.companyLogo || logoimage);
        } finally {
            // Reset file input
            e.target.value = '';
        }
    };

    return (
        <Drawer
            variant="permanent"
            open
            sx={{
                width: drawerWidth,
                display: { xs: 'none', sm: 'block' },
                '& .MuiDrawer-paper': {
                    width: drawerWidth,
                    alignItems: 'center',
                    overflow: 'hidden',
                },
            }}>

            <Box
                className={styles.sidebar}
                style={{
                    '--sidebar-background': mode === 'light' ? theme.palette.background.paper : theme.palette.background.default,
                    '--text-primary': mode === 'light' ? theme.palette.text.primary : theme.palette.text.primary,
                    '--hover-color': mode === 'light' ? 'rgba(128, 128, 128, 0.2)' : 'rgba(149, 149, 149, 0.1)',
                    '--active-background': mode === 'light' ? 'rgb(0, 0, 0)' : 'rgba(226, 223, 210, 0.3)',
                    '--active-text': mode === 'light' ? 'rgb(255, 255, 255)' : theme.palette.text.primary,
                    '--logo-brightness': mode === 'light' ? '1' : '0.8',
                    '--icon-brightness': mode === 'light' ? '1' : '1',
                }}>

                {/* Hidden file input for logo upload */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleLogoChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                />

                <Box className={styles.upperRow}>
                    <Stack
                        className={styles.logo}
                        flexDirection="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ position: 'relative' }}
                    >
                        <Stack
                            style={{
                                cursor: companyRole === 'company' ? 'pointer' : 'default',
                                opacity: isUpdatingLogo ? 0.7 : 1,
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            onClick={handleLogoClick}
                        >
                            {logo ? (
                                <img
                                    className={styles.image}
                                    src={logo}
                                    alt="Company logo"
                                />
                            ) : (
                                <Typography
                                    sx={{
                                        color: theme.palette.mode === 'light'
                                            ? theme.palette.text.primary
                                            : theme.palette.text.primary,
                                        fontWeight: 600,
                                        textAlign: 'center'
                                    }}
                                >
                                    {companyRole === 'company' ? 'Add Logo' : 'Company Logo'}
                                </Typography>
                            )}

                            {companyRole === 'company' && (
                                <div className={styles.tooltip}>
                                    {logo && logo !== logoimage ? 'Click to change logo' : 'Click to add logo'}
                                </div>
                            )}

                            {isUpdatingLogo && (
                                <div className={styles.loadingOverlay}>
                                    Updating...
                                </div>
                            )}
                        </Stack>
                    </Stack>

                    <List className={styles.list}>
                        {pages
                            .filter(p => !(companyRole === 'user' && p.name === 'Manage'))
                            .map(({ name, Icon, ActiveIcon, path }) => (
                                <React.Fragment key={name}>
                                    {/* {name === 'Clients' && <Typography className={styles.title}>Collaborate</Typography>}
                                {name === 'Services' && <Typography className={styles.title}>Tools</Typography>} */}
                                    <ListItem disablePadding className={`
                                    ${styles.listItem} 
                                    ${(name === 'Projects' && currentPath.includes(RouteNames.ADDPRODUCTS)) || currentPath === path ? styles.activeItem : ''}
                                    ${(name === 'SOP\'s' && currentPath.includes(RouteNames.SINGLEVIDEO)) || currentPath === path ? styles.activeItem : ''}
                                    `}>
                                        <ListItemButton onClick={() => handleClick(path)} className={styles.listItemBtn}>
                                            <ListItemIcon className={styles.listItemIcon}>
                                                <img
                                                    src={
                                                        (name === 'Projects' && currentPath.includes(RouteNames.ADDPRODUCTS)) ||
                                                            (name === 'SOP\'s' && currentPath.includes(RouteNames.SINGLEVIDEO)) ||
                                                            currentPath === path ? ActiveIcon : Icon}
                                                    alt={name}
                                                    className={`${styles.icon} ${currentPath === path ? styles.activeIcon : ''}`} />
                                            </ListItemIcon>
                                            <ListItemText primary={name} className={styles.listItemText} />
                                        </ListItemButton>

                                    </ListItem>
                                </React.Fragment>
                            ))}
                    </List>
                </Box>
                {companyRole === 'company' &&
                    <Typography sx={{ fontSize: "14px", fontWeight: 600, pl: 1, pb: 2 }}>{companyId}</Typography>
                }
            </Box>
        </Drawer>
    );
};

export default Sidebar;