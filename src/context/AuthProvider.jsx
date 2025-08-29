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

    // WebSocket reference and state for Electron integration
    const wsRef = useRef(null);
    const [wsConnectionState, setWsConnectionState] = useState('CLOSED');
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 5;
    const [isElectronAvailable, setIsElectronAvailable] = useState(false);

    // Theme effects 
    useEffect(() => {
        localStorage.setItem('Theme', mode);
        document.body.setAttribute('data-theme', mode);
    }, []);

    const toggleTheme = useCallback(() => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
    }, []);

    // Check if running in Electron environment
    const checkElectronEnvironment = useCallback(() => {
        // Check if we're in Electron
        const isElectron = !!(window.electronAPI || window.electron || navigator.userAgent.toLowerCase().includes('electron'));
        setIsElectronAvailable(isElectron);
        return isElectron;
    }, []);

    // WebSocket cleanup function
    const cleanupWebSocket = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            // Remove event listeners to prevent memory leaks
            wsRef.current.onopen = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;
            wsRef.current.onmessage = null;

            if (wsRef.current.readyState === WebSocket.OPEN || 
                wsRef.current.readyState === WebSocket.CONNECTING) {
                wsRef.current.close();
            }
            wsRef.current = null;
        }
        setWsConnectionState('CLOSED');
    }, []);

    // Send access token safely
    const sendAccessToken = useCallback((token) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && token) {
            try {
                wsRef.current.send(token);
                console.log("Access token sent to Electron");
            } catch (error) {
                console.error("Failed to send access token:", error);
            }
        }
    }, []);

    // Setup WebSocket with proper error handling
    const setupWebSocket = useCallback((token) => {
        if (!token || !isElectronAvailable) {
            console.log(isElectronAvailable ? "No token available" : "Not running in Electron environment, skipping WebSocket connection");
            return;
        }

        // Clean up existing connection
        cleanupWebSocket();

        try {
            const ws = new WebSocket("ws://localhost:3001");
            wsRef.current = ws;
            setWsConnectionState('CONNECTING');

            ws.onopen = () => {
                console.log("Connected to Electron WebSocket");
                setWsConnectionState('OPEN');
                reconnectAttemptsRef.current = 0;
                sendAccessToken(token);
            };

            ws.onerror = (error) => {
                console.warn("Electron WebSocket connection failed (this is normal if not running Electron app):", error);
                setWsConnectionState('ERROR');
            };

            ws.onclose = (event) => {
                console.log("Electron WebSocket closed:", event.code, event.reason);
                setWsConnectionState('CLOSED');

                // Only attempt reconnection if we're in Electron and it wasn't intentionally closed
                if (isElectronAvailable && event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current += 1;
                    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
                    
                    console.log(`Attempting Electron reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts} in ${delay}ms`);
                    
                    reconnectTimeoutRef.current = setTimeout(() => {
                        setupWebSocket(token);
                    }, delay);
                } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
                    console.log("Max Electron reconnection attempts reached");
                }
            };

            ws.onmessage = (event) => {
                // Handle messages from Electron if needed
                console.log("Message from Electron:", event.data);
            };

        } catch (error) {
            console.warn("Failed to create Electron WebSocket (this is normal if not running Electron app):", error);
            setWsConnectionState('ERROR');
        }
    }, [cleanupWebSocket, sendAccessToken, isElectronAvailable]);

    // Check Electron environment on mount
    useEffect(() => {
        checkElectronEnvironment();
    }, [checkElectronEnvironment]);

    // WebSocket management for Electron (only if Electron is available)
    useEffect(() => {
        if (accessToken && isElectronAvailable) {
            setupWebSocket(accessToken);
        } else {
            cleanupWebSocket();
        }

        return cleanupWebSocket;
    }, [accessToken, isElectronAvailable, setupWebSocket, cleanupWebSocket]);

    // User data query
    const { data: user, isLoading, error } = useQuery({
        queryKey: ["user", accessToken],
        queryFn: async () => {
            if (!accessToken) {
                ['role', 'roleAdmin'].forEach(
                    key => localStorage.removeItem(key)
                );
                return null;
            }
            
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
        setAccessToken,
        wsConnectionState, // Expose WebSocket state for debugging
        isElectronAvailable // Expose Electron availability
    }), [user, accessToken, isLoading, isAdmin, mode, toggleTheme, theme, wsConnectionState, isElectronAvailable]);

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