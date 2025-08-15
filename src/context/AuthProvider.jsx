import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { axiosInstance } from '../api/axiosInstance';
import { darkTheme, lightTheme } from '../Theme/Theme';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Auth state management
    const [accessToken, setAccessToken] = useState(() => {
        return localStorage.getItem('accessToken') || localStorage.getItem('accessAdminToken');
    });
    const isAdmin = useMemo(() => !!localStorage.getItem('accessAdminToken'), [accessToken]);

    // Theme management
    const [mode, setMode] = useState(() => {
        return localStorage.getItem("Theme") || 'light';
    });
    const theme = useMemo(() => (mode === 'light' ? lightTheme : darkTheme), [mode]);

    // WebSocket reference for Electron integration
    const wsRef = useRef(null);

    // Theme effects 
    useEffect(() => {
        localStorage.setItem('Theme', mode);
        document.body.setAttribute('data-theme', mode);
    }, [mode]);

    const toggleTheme = useCallback(() => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    }, []);

    // WebSocket management for Electron
    useEffect(() => {
        if (!accessToken) return;

        const setupWebSocket = () => {
            if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
                wsRef.current = new WebSocket("ws://localhost:3001");

                wsRef.current.onopen = () => {
                    console.log("Connected to Electron WebSocket");
                    wsRef.current.send(accessToken);
                };

                wsRef.current.onerror = (error) => {
                    console.error("WebSocket Error:", error);
                };

                wsRef.current.onclose = () => {
                    console.log("Electron WebSocket closed.");
                };
            } else {
                wsRef.current.send(accessToken);
            }
        };

        setupWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, [accessToken]);

    // User data query
    const { data: user, isLoading, error } = useQuery({
        queryKey: ["user", accessToken],
        queryFn: async () => {
            // if (!accessToken) {
            //     ['role', 'roleAdmin'].forEach(
            //         key => localStorage.removeItem(key)
            //     );
            //     return null;
            // }
            try {
                const endpoint = isAdmin ? '/admin/get-admin-data' : '/user/get-user-data';
                const response = await axiosInstance.get(endpoint, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                return response.data.data;
            } catch (error) {
                console.error('AuthProvider data error:', error);
                // Clear invalid token
                setAccessToken(null);
                localStorage.removeItem(isAdmin ? 'accessAdminToken' : 'accessToken');
                return null;
            }
        },
        retry: 1,
        staleTime: 5 * 60 * 1000,
    });

    // Context value
    const contextValue = useMemo(() => ({
        user,
        accessToken,
        isLoading,
        isAdmin,
        mode,
        toggleTheme,
        theme,
        setAccessToken
    }), [user, accessToken, isLoading, isAdmin, mode, toggleTheme, theme]);

    return (
        <AuthContext.Provider value={contextValue}>
            <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
        </AuthContext.Provider>
    );
};

AuthProvider.propTypes = {
    children: PropTypes.node.isRequired
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};