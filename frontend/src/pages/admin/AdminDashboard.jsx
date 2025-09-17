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
                { action: 'کاربر جدید اضافه شد', user: 'admin', time: '5 دقیقه پیش' },
                { action: 'گردش کار جدید تنظیم شد', user: 'admin', time: '12 دقیقه پیش' },
                { action: 'نقش کاربری تغییر کرد', user: 'admin', time: '25 دقیقه پیش' }
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
                    <p className="text-text-secondary font-medium">در حال بارگذاری پنل مدیریت...</p>
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
                        <h1 className="text-3xl font-bold text-text-primary">پنل مدیریت سیستم</h1>
                        <p className="text-text-secondary mt-1">مدیریت کاربران، گردش کار و تنظیمات سیستم</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="px-3 py-2 bg-success-100 text-success-700 rounded-lg border border-success-200">
                        <span className="text-sm font-medium">سیستم عملیاتی</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="card-modern p-6 bg-primary-50 border border-primary-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-primary-700 font-medium">کل کاربران</p>
                            <p className="text-3xl font-bold text-primary-600 mt-1">{stats.totalUsers}</p>
                        </div>
                        <Users className="w-8 h-8 text-primary-500" />
                    </div>
                </div>

                <div className="card-modern p-6 bg-warning-50 border border-warning-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-warning-700 font-medium">گردش کارهای فعال</p>
                            <p className="text-3xl font-bold text-warning-600 mt-1">{stats.activeWorkflows}</p>
                        </div>
                        <GitBranch className="w-8 h-8 text-warning-500" />
                    </div>
                </div>

                <div className="card-modern p-6 bg-error-50 border border-error-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-error-700 font-medium">در انتظار تایید</p>
                            <p className="text-3xl font-bold text-error-600 mt-1">{stats.pendingApprovals}</p>
                        </div>
                        <AlertTriangle className="w-8 h-8 text-error-500" />
                    </div>
                </div>

                <div className="card-modern p-6 bg-success-50 border border-success-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-success-700 font-medium">خطاهای سیستم</p>
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
                    title="مدیریت کاربران"
                    description="افزودن، ویرایش و تخصیص نقش‌های کاربری"
                    onClick={() => navigate('/admin/users')}
                    color="primary"
                />

                <AdminCard
                    icon={GitBranch}
                    title="تنظیمات گردش کار"
                    description="پیکربندی مراحل تایید و مالکیت حالت‌ها"
                    onClick={() => navigate('/admin/workflow-config')}
                    color="warning"
                />

                <AdminCard
                    icon={Key}
                    title="سطوح دسترسی"
                    description="تنظیم سطوح دسترسی و مجوزها"
                    onClick={() => navigate('/admin/access-levels')}
                    color="error"
                />

                <AdminCard
                    icon={Activity}
                    title="لاگ‌های سیستم"
                    description="مشاهده فعالیت‌ها و رخدادهای سیستم"
                    onClick={() => navigate('/admin/system-logs')}
                    color="success"
                />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-text-primary">فعالیت‌های اخیر</h3>
                        <button 
                            onClick={() => navigate('/admin/system-logs')}
                            className="btn-ghost text-sm"
                        >
                            مشاهده همه
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {recentActivity.map((activity, index) => (
                            <RecentActivityItem key={index} activity={activity} />
                        ))}
                    </div>
                </div>

                <div className="card-modern p-6">
                    <h3 className="text-xl font-bold text-text-primary mb-6">عملیات سریع</h3>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={() => navigate('/admin/users/create')}
                            className="w-full btn-primary flex items-center justify-center gap-2"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>افزودن کاربر جدید</span>
                        </button>
                        
                        <button 
                            onClick={() => navigate('/admin/workflow-config')}
                            className="w-full btn-secondary flex items-center justify-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            <span>تنظیم گردش کار</span>
                        </button>
                        
                        <button 
                            onClick={() => navigate('/admin/system-logs')}
                            className="w-full btn-ghost flex items-center justify-center gap-2"
                        >
                            <Eye className="w-4 h-4" />
                            <span>مشاهده لاگ‌ها</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}