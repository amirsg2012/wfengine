// src/api/client.js
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

// Response interceptor - simplified
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
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;