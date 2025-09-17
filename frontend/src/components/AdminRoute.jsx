// src/components/AdminRoute.jsx - Protected Route for Admin Access
import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../api/useAuth';

export default function AdminRoute({ children }) {
    const { me, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored mx-auto mb-4">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-text-secondary font-medium">\u062f\u0631 \u062d\u0627\u0644 \u0628\u0631\u0631\u0633\u06cc \u062f\u0633\u062a\u0631\u0633\u06cc...</p>
                </div>
            </div>
        );
    }

    // Check if user has admin access (superuser or admin role)
    if (!me?.is_superuser && !me?.role_codes?.includes('ADMIN')) {
        return <Navigate to="/inbox" replace />;
    }

    return children;
}