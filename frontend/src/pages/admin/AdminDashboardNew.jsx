// src/pages/admin/AdminDashboardNew.jsx
import React, { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    GitBranch,
    FileText,
    Activity,
    TrendingUp,
    AlertCircle,
    CheckCircle,
    Clock,
    BarChart3,
    Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/client';

const StatCard = ({ title, value, icon: Icon, color, link }) => {
    const colorClasses = {
        primary: 'bg-primary-100 text-primary-600 border-primary-200',
        success: 'bg-success-100 text-success-600 border-success-200',
        warning: 'bg-warning-100 text-warning-600 border-warning-200',
        error: 'bg-error-100 text-error-600 border-error-200',
        info: 'bg-info-100 text-info-600 border-info-200'
    };

    const CardContent = () => (
        <div className="card-modern p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-7 h-7" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-bold text-text-primary mb-1">{value}</h3>
                <p className="text-sm text-text-secondary">{title}</p>
            </div>
        </div>
    );

    return link ? (
        <Link to={link}>
            <CardContent />
        </Link>
    ) : (
        <CardContent />
    );
};

const QuickActionCard = ({ title, description, icon: Icon, link, color = 'primary' }) => {
    const colorClasses = {
        primary: 'bg-primary-50 text-primary-600 border-primary-200 hover:bg-primary-100',
        success: 'bg-success-50 text-success-600 border-success-200 hover:bg-success-100',
        warning: 'bg-warning-50 text-warning-600 border-warning-200 hover:bg-warning-100',
        error: 'bg-error-50 text-error-600 border-error-200 hover:bg-error-100'
    };

    return (
        <Link to={link}>
            <div className={`card-modern p-4 hover:shadow-lg transition-all cursor-pointer border ${colorClasses[color]}`}>
                <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses[color]}`}>
                        <Icon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-text-primary mb-1">{title}</h4>
                        <p className="text-sm text-text-secondary">{description}</p>
                    </div>
                </div>
            </div>
        </Link>
    );
};

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [onlineUsers, setOnlineUsers] = useState([]);

    useEffect(() => {
        fetchDashboardStats();
        fetchOnlineUsers();

        // Refresh online users every 30 seconds
        const interval = setInterval(fetchOnlineUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/workflows/stats/');
            setStats(response.data);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchOnlineUsers = async () => {
        try {
            const response = await api.get('/admin/dashboard/online-users/');
            setOnlineUsers(response.data.users || []);
        } catch (error) {
            console.error('Error fetching online users:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-text-secondary">در حال بارگذاری...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-text-primary mb-2">پنل مدیریت</h1>
                <p className="text-text-secondary">مدیریت کاربران، دسترسی‌ها و تنظیمات سیستم</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    title="کل درخواست‌ها"
                    value={stats?.total_letters || 0}
                    icon={FileText}
                    color="primary"
                    link="/admin"
                />
                <StatCard
                    title="در انتظار پردازش"
                    value={stats?.pending_letters || 0}
                    icon={Clock}
                    color="warning"
                    link="/admin"
                />
                <StatCard
                    title="تکمیل شده امروز"
                    value={stats?.completed_today || 0}
                    icon={CheckCircle}
                    color="success"
                    link="/admin"
                />
                <StatCard
                    title="نیاز به اقدام"
                    value={stats?.pending_my_action || 0}
                    icon={AlertCircle}
                    color="error"
                    link="/admin"
                />
                <StatCard
                    title="کاربران آنلاین"
                    value={onlineUsers.length}
                    icon={Activity}
                    color="info"
                />
            </div>

            {/* Online Users Widget */}
            {onlineUsers.length > 0 && (
                <div className="card-modern">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <Activity className="w-5 h-5 text-success-500" />
                            کاربران آنلاین ({onlineUsers.length})
                        </h3>
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-text-secondary">به‌روزرسانی هر 30 ثانیه</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                        {onlineUsers.map((user) => (
                            <div key={user.id} className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-gray-200 hover:border-primary-300 transition-colors">
                                <div className="relative">
                                    <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold">
                                        {user.username?.substring(0, 2).toUpperCase() || 'U'}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-text-primary text-sm truncate">
                                        {user.first_name && user.last_name
                                            ? `${user.first_name} ${user.last_name}`
                                            : user.username}
                                    </p>
                                    <p className="text-xs text-text-secondary truncate">{user.email || 'بدون ایمیل'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h2 className="text-xl font-bold text-text-primary mb-4">دسترسی سریع</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <QuickActionCard
                        title="مدیریت کاربران"
                        description="افزودن، ویرایش و حذف کاربران سیستم"
                        icon={Users}
                        link="/admin/users"
                        color="primary"
                    />
                    <QuickActionCard
                        title="مدیریت دسترسی‌ها"
                        description="تنظیم سطوح دسترسی و مجوزها"
                        icon={Shield}
                        link="/admin/permissions"
                        color="warning"
                    />
                    <QuickActionCard
                        title="مدیریت گردش کار"
                        description="ویرایش مراحل و وضعیت‌های گردش کار"
                        icon={GitBranch}
                        link="/admin/workflow-template"
                        color="success"
                    />
                    <QuickActionCard
                        title="لاگ‌های سیستم"
                        description="مشاهده فعالیت‌ها و تغییرات سیستم"
                        icon={Activity}
                        link="/admin/logs"
                        color="info"
                    />
                    <QuickActionCard
                        title="تنظیمات سیستم"
                        description="پیکربندی عمومی سیستم"
                        icon={Settings}
                        link="/admin/settings"
                        color="primary"
                    />
                    <QuickActionCard
                        title="گزارش‌ها و آمار"
                        description="مشاهده گزارش‌های تحلیلی"
                        icon={BarChart3}
                        link="/admin/reports"
                        color="success"
                    />
                </div>
            </div>

            {/* Recent Activity Section */}
            <div className="card-modern">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">آخرین فعالیت‌ها</h3>
                        <p className="text-sm text-text-secondary">تغییرات اخیر در سیستم</p>
                    </div>
                    <Link
                        to="/admin/logs"
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                        مشاهده همه
                    </Link>
                </div>

                <div className="text-center py-8 text-text-secondary">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>برای مشاهده فعالیت‌ها به صفحه لاگ‌ها بروید</p>
                </div>
            </div>
        </div>
    );
}
