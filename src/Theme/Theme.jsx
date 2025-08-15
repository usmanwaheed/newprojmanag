import { createTheme } from '@mui/material/styles';

export const lightTheme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            dark: '#1565c0',
            light: '#42a5f5',
        },
        secondary: {
            main: '#7b1fa2',
            dark: '#6a1b9a',
            light: '#9c27b0',
        },
        accent: {
            main: '#ff6d00',
            dark: '#e65100',
            light: '#ff9100',
        },
        neutral: {
            main: '#5c6bc0',
            dark: '#3949ab',
            light: '#7986cb',
        },
        background: {
            paper: '#FAF9F6',
            default: '#ffffff',
            subtle: '#f5f5f5',
        },
        text: {
            primary: '#424242',
            secondary: '#616161',
            disabled: '#9e9e9e',
        },
        divider: 'rgba(0, 0, 0, 0.12)',
    },
    typography: {
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    },
});

export const darkTheme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#bb86fc',
            dark: '#9a67ea',
            light: '#d1b3ff',
        },
        secondary: {
            main: '#03dac6',
            dark: '#018786',
            light: '#66fff9',
        },
        accent: {
            main: '#ff7597',
            dark: '#c43e5f',
            light: '#ffa7b8',
        },
        neutral: {
            main: '#7c4dff',
            dark: '#651fff',
            light: '#b388ff',
        },
        background: {
            paper: '#343434',
            default: '#28282B',
            subtle: '#1e1e1e',
        },
        text: {
            primary: '#E2DFD2',
            secondary: '#D3D3D3',
            disabled: '#a0a0a0',
        },
        divider: 'rgba(255, 255, 255, 0.12)',
    },
    typography: {
        fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    },
});