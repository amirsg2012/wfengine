// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Shell from './layout/Shell';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import WorkflowList from './pages/WorkflowList';
import WorkflowCreate from './pages/WorkflowCreate';
import WorkflowDetail from './pages/WorkflowDetail';
import Reports from './pages/Reports';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import WorkflowConfiguration from './pages/admin/WorkflowConfiguration';
import SystemLogs from './pages/admin/SystemLogs';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import { AuthProvider } from './api/useAuth';
import useAuth from './api/useAuth';
import './App.css';

// Create a client
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

function AppContent() {
    const { token, loading } = useAuth();

    console.log('AppContent render - token:', token, 'loading:', loading);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored mx-auto mb-4">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-text-secondary font-medium">در حال بارگذاری...</p>
                </div>
            </div>
        );
    }

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/login" element={
                token ? <Navigate to="/inbox" replace /> : <Login />
            } />
            
            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Shell /></ProtectedRoute>}>
                <Route index element={<Navigate to="/inbox" replace />} />
                <Route path="inbox" element={<Dashboard />} />
                <Route path="letters" element={<WorkflowList />} />
                <Route path="letters/create" element={<WorkflowCreate />} />
                <Route path="letters/:id" element={<WorkflowDetail />} />
                <Route path="reports" element={<Reports />} />
                
                {/* Admin Routes */}
                <Route path="admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                <Route path="admin/workflow-config" element={<AdminRoute><WorkflowConfiguration /></AdminRoute>} />
                <Route path="admin/system-logs" element={<AdminRoute><SystemLogs /></AdminRoute>} />
            </Route>
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to={token ? "/inbox" : "/login"} replace />} />
        </Routes>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <Router>
                    <AppContent />
                </Router>
            </AuthProvider>
        </QueryClientProvider>
    );
}

export default App;