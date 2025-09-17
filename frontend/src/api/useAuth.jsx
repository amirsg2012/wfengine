// src/api/useAuth.jsx - FIXED VERSION
import { useState, useEffect, createContext, useContext } from 'react';
import api from './client';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('access_token'));
    const [me, setMe] = useState(null);
    const [loading, setLoading] = useState(true);

    // Login function - FIXED to properly handle async flow
    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/', { username, password });
            const { access, refresh } = response.data;
            
            // Store tokens first
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            
            // Update state immediately
            setToken(access);
            
            // Wait a tick to ensure state update is processed
            await new Promise(resolve => setTimeout(resolve, 0));
            
            // Now fetch user data with the new token
            try {
                const meResponse = await api.get('/me/');
                setMe(meResponse.data);
                console.log('User data fetched successfully after login');
            } catch (meError) {
                console.log('Could not fetch user data immediately after login:', meError);
                // Don't fail login if /me/ fails - the token is still valid
                setMe(null);
            }
            
            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            // Make sure to clear any partial state on login failure
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setToken(null);
            setMe(null);
            
            return { 
                success: false, 
                error: error.response?.data?.detail || 'Login failed' 
            };
        }
    };

    // Logout function
    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setToken(null);
        setMe(null);
    };

    // Fetch user data - doesn't auto-logout on failure
    const fetchMe = async () => {
        if (!token) {
            setMe(null);
            return false;
        }

        try {
            const response = await api.get('/me/');
            setMe(response.data);
            return true;
        } catch (error) {
            console.error('Failed to fetch user data:', error);
            // Don't automatically logout - let the user stay logged in
            // The token might still be valid even if /me/ endpoint has issues
            return false;
        }
    };

    // Initial auth check on mount only
    useEffect(() => {
        const initAuth = async () => {
            const storedToken = localStorage.getItem('access_token');
            
            if (storedToken) {
                setToken(storedToken);
                // Try to fetch user data but don't logout if it fails
                await fetchMe();
            }
            
            setLoading(false);
        };
        
        initAuth();
    }, []); // Empty dependency array - only run once on mount

    // Listen for storage changes (logout from another tab)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'access_token') {
                if (e.newValue) {
                    setToken(e.newValue);
                } else {
                    setToken(null);
                    setMe(null);
                }
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const value = {
        token,
        me,
        loading,
        login,
        logout,
        fetchMe,
        isAuthenticated: !!token
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export default function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}