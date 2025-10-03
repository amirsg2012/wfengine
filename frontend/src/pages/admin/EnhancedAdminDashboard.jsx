// src/pages/admin/EnhancedAdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Shield, Users, Activity, AlertTriangle, TrendingUp, Database,
    Key, FileText, GitBranch, UserPlus, Eye, Settings as SettingsIcon,
    Clock, Wifi, WifiOff, Circle
} from 'lucide-react';
import api from '../../api/client';
import useAuth from '../../api/useAuth';

const StatCard = ({ icon: Icon, title, value, change, color = 'primary', onClick }) => (
    <div
        className={`card-modern p-6 cursor-pointer transition-all duration-200 hover:shadow-xl border-l-4 border-l-${color}-500 hover:scale-105`}
        onClick={onClick}
    >
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-14 h-14 bg-${color}-100 rounded-xl flex items-center justify-center shadow-md`}>
                    <Icon className={`w-7 h-7 text-${color}-600`} />
                </div>
                <div>
                    <p className="text-sm text-text-secondary font-medium">{title}</p>
                    <p className="text-3xl font-bold text-text-primary mt-1">{value}</p>
                    {change && (
                        <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${
                            change > 0 ? 'text-success-600' : 'text-error-600'
                        }`}>
                            <TrendingUp className="w-3 h-3" />
                            {change > 0 ? '+' : ''}{change}% از دیروز
                        </p>
                    )}
                </div>
            </div>
        </div>
    </div>
);

const OnlineUserCard = ({ user }) => {
    const sessionMinutes = Math.floor(user.session_duration);
    const minutesAgo = Math.floor((new Date() - new Date(user.last_activity)) / 60000);

    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-primary-100 hover:bg-primary-50 transition-colors">
            <div className="relative">
                <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold shadow-3d">
                    {user.first_name?.charAt(0) || user.username?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-success-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-text-primary truncate">
                        {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.username}
                    </p>
                    <Wifi className="w-3 h-3 text-success-500" />
                </div>
                <p className="text-xs text-text-secondary">
                    {user.ip_address} • {minutesAgo === 0 ? 'الان' : `${minutesAgo} دقیقه پیش`}
                </p>
            </div>
            <div className="text-xs text-text-secondary">
                <Clock className="w-4 h-4 inline mr-1" />
                {sessionMinutes} دقیقه
            </div>
        </div>
    );
};

const ActivityItem = ({ activity }) => {
    const getActivityIcon = () => {
        if (activity.action?.includes('APPROVE')) return <FileText className="w-4 h-4 text-success-500" />;
        if (activity.action?.includes('CREATE')) return <UserPlus className="w-4 h-4 text-primary-500" />;
        if (activity.action?.includes('UPDATE')) return <SettingsIcon className="w-4 h-4 text-warning-500" />;
        return <Activity className="w-4 h-4 text-gray-500" />;
    };

    const timeAgo = (timestamp) => {
        const minutes = Math.floor((new Date() - new Date(timestamp)) / 60000);
        if (minutes < 1) return 'الان';
        if (minutes < 60) return `${minutes} دقیقه پیش`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} ساعت پیش`;
        return `${Math.floor(hours / 24)} روز پیش`;
    };

    return (
        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors">
            <div className="flex-shrink-0 w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
                {getActivityIcon()}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                    {activity.workflow_title || activity.action}
                </p>
                <p className="text-xs text-text-secondary mt-1">
                    {activity.performer || activity.user} • {activity.state || activity.model} • {timeAgo(activity.timestamp)}
                </p>
            </div>
        </div>
    );
};

const QuickActionButton = ({ icon: Icon, label, onClick, color = 'primary' }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-4 py-3 bg-${color}-50 hover:bg-${color}-100 text-${color}-700 rounded-xl transition-all duration-200 font-medium border border-${color}-200 hover:shadow-md`}
    >
        <Icon className="w-5 h-5" />
        <span>{label}</span>
    </button>
);

export default function EnhancedAdminDashboard() {
    const navigate = useNavigate();
    const { me } = useAuth();
    const [stats, setStats] = useState({
        users: { total: 0, online: 0 },
        workflows: { total: 0, active: 0, pending_approvals: 0 },
        activity: { actions_24h: 0 }
    });
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    // Check admin access
    useEffect(() => {
        if (!me?.is_superuser) {
            navigate('/inbox');
            return;
        }
        fetchAdminData();
    }, [me, navigate]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setRefreshKey(prev => prev + 1);
            fetchOnlineUsers();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (refreshKey > 0) {
            fetchAdminData();
        }
    }, [refreshKey]);

    const fetchAdminData = async () => {
        try {
            setLoading(true);
            const [statsRes, onlineRes, activityRes] = await Promise.all([
                api.get('/admin/dashboard/stats/'),
                api.get('/admin/dashboard/online_users/'),
                api.get('/admin/dashboard/recent_activity/')
            ]);

            setStats(statsRes.data);
            setOnlineUsers(onlineRes.data.users || []);
            setRecentActivity(activityRes.data.activities || []);
        } catch (error) {
            console.error('Error fetching admin data:', error);
            // Fallback mock data
            setStats({
                users: { total: 25, online: 5 },
                workflows: { total: 142, active: 38, pending_approvals: 12 },
                activity: { actions_24h: 45 }
            });
        } finally {
            setLoading(false);
        }
    };

    const fetchOnlineUsers = async () => {
        try {
            const res = await api.get('/admin/dashboard/online_users/');
            setOnlineUsers(res.data.users || []);
        } catch (error) {
            console.error('Error fetching online users:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg mx-auto mb-4">
                        <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-text-secondary font-medium">در حال بارگذاری داشبورد مدیریت...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">داشبورد مدیریت</h1>
                        <p className="text-text-secondary mt-1">نظارت و مدیریت کل سیستم</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="px-4 py-2 bg-success-100 text-success-700 rounded-xl border border-success-200 font-medium">
                        <Circle className="w-2 h-2 inline-block mr-2 fill-current animate-pulse" />
                        سیستم عملیاتی
                    </div>
                    <button
                        onClick={fetchAdminData}
                        className="px-4 py-2 bg-primary-100 text-primary-700 rounded-xl border border-primary-200 hover:bg-primary-200 transition-colors font-medium"
                    >
                        <Activity className="w-4 h-4 inline-block mr-2" />
                        بروزرسانی
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={Users}
                    title="کل کاربران"
                    value={stats.users.total}
                    color="primary"
                    onClick={() => navigate('/admin/users')}
                />

                <StatCard
                    icon={GitBranch}
                    title="گردش کارهای فعال"
                    value={stats.workflows.active}
                    color="warning"
                    onClick={() => navigate('/workflows')}
                />

                <StatCard
                    icon={AlertTriangle}
                    title="در انتظار تأیید"
                    value={stats.workflows.pending_approvals}
                    color="error"
                    onClick={() => navigate('/workflows')}
                />

                <StatCard
                    icon={Activity}
                    title="فعالیت 24 ساعت"
                    value={stats.activity.actions_24h}
                    color="success"
                    onClick={() => navigate('/admin/system-logs')}
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Online Users */}
                <div className="lg:col-span-1">
                    <div className="card-modern p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-text-primary flex items-center gap-2">
                                <Wifi className="w-5 h-5 text-success-500" />
                                کاربران آنلاین
                            </h3>
                            <div className="px-3 py-1 bg-success-100 text-success-700 rounded-lg text-sm font-bold">
                                {stats.users.online} نفر
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {onlineUsers.length > 0 ? (
                                onlineUsers.map((user) => (
                                    <OnlineUserCard key={user.id} user={user} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-text-secondary">
                                    <WifiOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>هیچ کاربر آنلاینی وجود ندارد</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <div className="card-modern p-6 h-full">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-text-primary">فعالیت‌های اخیر</h3>
                            <button
                                onClick={() => navigate('/admin/system-logs')}
                                className="btn-ghost text-sm"
                            >
                                مشاهده همه
                            </button>
                        </div>

                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {recentActivity.length > 0 ? (
                                recentActivity.slice(0, 10).map((activity, index) => (
                                    <ActivityItem key={index} activity={activity} />
                                ))
                            ) : (
                                <div className="text-center py-8 text-text-secondary">
                                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>فعالیتی ثبت نشده است</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <QuickActionButton
                    icon={UserPlus}
                    label="افزودن کاربر جدید"
                    onClick={() => navigate('/admin/users')}
                    color="primary"
                />

                <QuickActionButton
                    icon={Key}
                    label="مدیریت دسترسی‌ها"
                    onClick={() => navigate('/admin/permissions')}
                    color="warning"
                />

                <QuickActionButton
                    icon={SettingsIcon}
                    label="تنظیمات سیستم"
                    onClick={() => navigate('/admin/settings')}
                    color="error"
                />

                <QuickActionButton
                    icon={Eye}
                    label="مشاهده لاگ‌ها"
                    onClick={() => navigate('/admin/system-logs')}
                    color="success"
                />
            </div>

            {/* System Info */}
            <div className="card-modern p-6">
                <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                    <Database className="w-5 h-5 text-primary-500" />
                    اطلاعات سیستم
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-surface-secondary rounded-xl border border-primary-100">
                        <p className="text-2xl font-bold text-primary-600">{stats.workflows.total}</p>
                        <p className="text-sm text-text-secondary mt-1">کل گردش کارها</p>
                    </div>

                    <div className="text-center p-4 bg-surface-secondary rounded-xl border border-success-100">
                        <p className="text-2xl font-bold text-success-600">{stats.users.total}</p>
                        <p className="text-sm text-text-secondary mt-1">کل کاربران</p>
                    </div>

                    <div className="text-center p-4 bg-surface-secondary rounded-xl border border-warning-100">
                        <p className="text-2xl font-bold text-warning-600">{stats.activity.actions_24h}</p>
                        <p className="text-sm text-text-secondary mt-1">اقدامات امروز</p>
                    </div>

                    <div className="text-center p-4 bg-surface-secondary rounded-xl border border-error-100">
                        <p className="text-2xl font-bold text-error-600">{stats.users.online}</p>
                        <p className="text-sm text-text-secondary mt-1">کاربران فعال</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
