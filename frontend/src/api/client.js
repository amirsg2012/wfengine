// src/api/client.js - FIXED VERSION
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

// Store reference to navigate function that will be set by the app
let navigateRef = null;

// Function to set the navigate reference from React Router
export const setNavigateRef = (navigate) => {
    navigateRef = navigate;
};

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - FIXED to use React Router navigation
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Only clear tokens for 401 on non-auth endpoints
        if (error.response?.status === 401) {
            const isAuthEndpoint = error.config.url?.includes('/auth/');
            const isLoginPage = window.location.pathname === '/login';
            
            // Don't clear tokens during login or for the auth endpoint itself
            if (!isAuthEndpoint && !isLoginPage) {
                console.log('401 error - clearing tokens');
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                
                // Use React Router navigation instead of window.location
                if (navigateRef && window.location.pathname !== '/login') {
                    navigateRef('/login', { replace: true });
                } else {
                    // Fallback only if React Router navigation isn't available
                    console.warn('React Router navigation not available, using window.location as fallback');
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

// Add this method to your existing API client
export const uploadAttachment = async (workflowId, file, name) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('workflow', workflowId);

    return api.post('/attachments/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export default api;