// src/api/useAuth.js
import { useState, useEffect, createContext, useContext } from 'react';
import api from './client';

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login function
    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/', { username, password });
            const { access, refresh } = response.data;
            
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            setToken(access);
            
            // Fetch user data
            await fetchMe();
            
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.detail || 'Login failed');
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setMe(null);
    };

    // Fetch user data
    const fetchMe = async () => {
        try {
            const response = await api.get('/me/');
            setMe(response.data);
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            // If fetching user data fails, logout
            logout();
        }
    };

    // Check authentication status on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (token) {
                await fetchMe();
            }
            setLoading(false);
        };
        
        checkAuth();
    }, [token]);

    const value = {
        token,
        me,
        loading,
        login,
        logout,
        fetchMe
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook to use auth context
export default function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}