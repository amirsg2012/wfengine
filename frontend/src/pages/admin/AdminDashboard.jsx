// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    Users,
    Settings,
    Activity,
    GitBranch,
    UserPlus,
    Eye,
    AlertTriangle,
    TrendingUp,
    Database,
    Key,
    FileText
} from 'lucide-react';
import api from '../../api/client';
import useAuth from '../../api/useAuth';

const AdminCard = ({ icon: Icon, title, description, value, onClick, color = 'primary' }) => (
    <div 
        className={`card-modern p-6 cursor-pointer transition-all duration-200 hover:shadow-lg border-l-4 border-l-${color}-500`}
        onClick={onClick}
    >
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 bg-${color}-100 rounded-xl flex items-center justify-center`}>
                    <Icon className={`w-6 h-6 text-${color}-600`} />
                </div>
                <div>
                    <h3 className="font-bold text-lg text-text-primary">{title}</h3>
                    <p className="text-sm text-text-secondary mt-1">{description}</p>
                    {value && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-2xl font-bold text-primary-600">{value}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const RecentActivityItem = ({ activity }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-primary-25 border border-primary-100">
        <div className="w-2 h-2 rounded-full bg-primary-500"></div>
        <div className="flex-1">
            <p className="text-sm font-medium text-text-primary">{activity.action}</p>
            <p className="text-xs text-text-secondary">{activity.user} - {activity.time}</p>
        </div>
    </div>
);

export default function AdminDashboard() {
    const navigate = useNavigate();
    const { me } = useAuth();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeWorkflows: 0,
        pendingApprovals: 0,
        systemErrors: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);

    // Check if user has admin access
    useEffect(() => {
        if (!me?.is_superuser && !me?.role_codes?.includes('ADMIN')) {
            navigate('/inbox');
            return;
        }
        fetchAdminData();
    }, [me, navigate]);

    const fetchAdminData = async () => {
        try {
            setLoading(true);
            
            // Fetch admin statistics
            const [statsRes, activityRes] = await Promise.all([
                api.get('/admin/stats/'),
                api.get('/admin/recent-activity/')
            ]);

            setStats(statsRes.data);
            setRecentActivity(activityRes.data.results || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            // Mock data for demo
            setStats({
                totalUsers: 25,
                activeWorkflows: 142,
                pendingApprovals: 18,
                systemErrors: 3
            });
            setRecentActivity([
                { action: '\u06a9\u0627\u0631\u0628\u0631 \u062c\u062f\u06cc\u062f \u0627\u0636\u0627\u0641\u0647 \u0634\u062f', user: 'admin', time: '5 \u062f\u0642\u06cc\u0642\u0647 \u067e\u06cc\u0634' },
                { action: '\u06af\u0631\u062f\u0634 \u06a9\u0627\u0631 \u062c\u062f\u06cc\u062f \u062a\u0646\u0638\u06cc\u0645 \u0634\u062f', user: 'admin', time: '12 \u062f\u0642\u06cc\u0642\u0647 \u067e\u06cc\u0634' },
                { action: '\u0646\u0642\u0634 \u06a9\u0627\u0631\u0628\u0631\u06cc \u062a\u063a\u06cc\u06cc\u0631 \u06a9\u0631\u062f', user: 'admin', time: '25 \u062f\u0642\u06cc\u0642\u0647 \u067e\u06cc\u0634' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored mx-auto mb-4">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-text-secondary font-medium">\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u067e\u0646\u0644 \u0645\u062f\u06cc\u0631\u06cc\u062a...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored">
                        <Shield className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">\u067e\u0646\u0644 \u0645\u062f\u06cc\u0631\u06cc\u062a \u0633\u06cc\u0633\u062a\u0645</h1>
                        <p className="text-text-secondary mt-1">\u0645\u062f\u06cc\u0631\u06cc\u062a \u06a9\u0627\u0631\u0628\u0631\u0627\u0646\u060c \u06af\u0631\u062f\u0634 \u06a9\u0627\u0631 \u0648 \u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u0633\u06cc\u0633\u062a\u0645</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="px-3 py-2 bg-success-100 text-success-700 rounded-lg border border-success-200">
                        <span className="text-sm font-medium">\u0633\u06cc\u0633\u062a\u0645 \u0639\u0645\u0644\u06cc\u0627\u062a\u06cc</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-modern p-6 bg-primary-50 border border-primary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-primary-700 font-medium">\u06a9\u0644 \u06a9\u0627\u0631\u0628\u0631\u0627\u0646</p>
                            <p className="text-3xl font-bold text-primary-600 mt-1">{stats.totalUsers}</p>
                        </div>
                        <Users className="w-8 h-8 text-primary-500" />
                    </div>
                </div>

                <div className="card-modern p-6 bg-warning-50 border border-warning-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning-700 font-medium">\u06af\u0631\u062f\u0634 \u06a9\u0627\u0631\u0647\u0627\u06cc \u0641\u0639\u0627\u0644</p>
                            <p className="text-3xl font-bold text-warning-600 mt-1">{stats.activeWorkflows}</p>
                        </div>
                        <GitBranch className="w-8 h-8 text-warning-500" />
                    </div>
                </div>

                <div className="card-modern p-6 bg-error-50 border border-error-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-error-700 font-medium">\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u062a\u0627\u06cc\u06cc\u062f</p>
                            <p className="text-3xl font-bold text-error-600 mt-1">{stats.pendingApprovals}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-error-500" />
                    </div>
                </div>

                <div className="card-modern p-6 bg-success-50 border border-success-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success-700 font-medium">\u062e\u0637\u0627\u0647\u0627\u06cc \u0633\u06cc\u0633\u062a\u0645</p>
                            <p className="text-3xl font-bold text-success-600 mt-1">{stats.systemErrors}</p>
                        </div>
                        <Activity className="w-8 h-8 text-success-500" />
                    </div>
                </div>
            </div>

            {/* Main Admin Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AdminCard
                    icon={Users}
                    title="\u0645\u062f\u06cc\u0631\u06cc\u062a \u06a9\u0627\u0631\u0628\u0631\u0627\u0646"
                    description="\u0627\u0641\u0632\u0648\u062f\u0646\u060c \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0648 \u062a\u062e\u0635\u06cc\u0635 \u0646\u0642\u0634\u200c\u0647\u0627\u06cc \u06a9\u0627\u0631\u0628\u0631\u06cc"
                    onClick={() => navigate('/admin/users')}
                    color="primary"
                />

                <AdminCard
                    icon={GitBranch}
                    title="\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u06af\u0631\u062f\u0634 \u06a9\u0627\u0631"
                    description="\u067e\u06cc\u06a9\u0631\u0628\u0646\u062f\u06cc \u0645\u0631\u0627\u062d\u0644 \u062a\u0627\u06cc\u06cc\u062f \u0648 \u0645\u0627\u0644\u06a9\u06cc\u062a \u062d\u0627\u0644\u062a\u200c\u0647\u0627"
                    onClick={() => navigate('/admin/workflow-config')}
                    color="warning"
                />

                <AdminCard
                    icon={Key}
                    title="\u0633\u0637\u0648\u062d \u062f\u0633\u062a\u0631\u0633\u06cc"
                    description="\u062a\u0646\u0638\u06cc\u0645 \u0633\u0637\u0648\u062d \u062f\u0633\u062a\u0631\u0633\u06cc \u0648 \u0645\u062c\u0648\u0632\u0647\u0627"
                    onClick={() => navigate('/admin/access-levels')}
                    color="error"
                />

                <AdminCard
                    icon={Activity}
                    title="\u0644\u0627\u06af\u200c\u0647\u0627\u06cc \u0633\u06cc\u0633\u062a\u0645"
                    description="\u0645\u0634\u0627\u0647\u062f\u0647 \u0641\u0639\u0627\u0644\u06cc\u062a\u200c\u0647\u0627 \u0648 \u0631\u062e\u062f\u0627\u062f\u0647\u0627\u06cc \u0633\u06cc\u0633\u062a\u0645"
                    onClick={() => navigate('/admin/system-logs')}
                    color="success"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-text-primary">\u0641\u0639\u0627\u0644\u06cc\u062a\u200c\u0647\u0627\u06cc \u0627\u062e\u06cc\u0631</h3>
                        <button 
                            onClick={() => navigate('/admin/system-logs')}
                            className="btn-ghost text-sm"
                        >
                            \u0645\u0634\u0627\u0647\u062f\u0647 \u0647\u0645\u0647
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {recentActivity.map((activity, index) => (
                            <RecentActivityItem key={index} activity={activity} />
                        ))}
                    </div>
                </div>

                <div className="card-modern p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-6">\u0639\u0645\u0644\u06cc\u0627\u062a \u0633\u0631\u06cc\u0639</h3>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={() => navigate('/admin/users/create')}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>\u0627\u0641\u0632\u0648\u062f\u0646 \u06a9\u0627\u0631\u0628\u0631 \u062c\u062f\u06cc\u062f</span>
                        </button>
                        
                        <button 
                            onClick={() => navigate('/admin/workflow-config')}
                            className="w-full btn-secondary flex items-center justify-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            <span>\u062a\u0646\u0638\u06cc\u0645 \u06af\u0631\u062f\u0634 \u06a9\u0627\u0631</span>
                        </button>
                        
                        <button 
                            onClick={() => navigate('/admin/system-logs')}
                            className="w-full btn-ghost flex items-center justify-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            <span>\u0645\u0634\u0627\u0647\u062f\u0647 \u0644\u0627\u06af\u200c\u0647\u0627</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}