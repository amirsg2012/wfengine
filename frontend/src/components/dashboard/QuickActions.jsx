// src/components/dashboard/QuickActions.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import {
    Search,
    Filter,
    Download,
    RefreshCw,
    Bell,
    Calendar,
    Users,
    Settings,
    BarChart2,
    Archive
} from 'lucide-react';

const ActionButton = ({ icon: Icon, label, onClick, variant = 'default' }) => {
    const variants = {
        default: 'btn-ghost',
        primary: 'btn-primary',
        secondary: 'btn-secondary'
    };

    return (
        <button
            onClick={onClick}
            className={`${variants[variant]} !p-3 flex flex-col items-center gap-2 min-w-[80px]`}
        >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
};

export default function QuickActions() {
    const navigate = useNavigate();
    const [onlineUsers, setOnlineUsers] = useState({ count: 0, users: [] });
    const [loadingOnline, setLoadingOnline] = useState(true);

    const actions = [

        {
            icon: Filter,
            label: 'درخواست‌ها',
            onClick: () => navigate('/workflows'),
            variant: 'default'
        },
        {
            icon: BarChart2,
            label: 'گزارشات',
            onClick: () => navigate('/reports'),
            variant: 'default'
        },

        {
            icon: Settings,
            label: 'تنظیمات',
            onClick: () => navigate('/profile'),
            variant: 'default'
        }
    ];

    const fetchOnlineUsers = async () => {
        try {
            setLoadingOnline(true);
            const response = await api.get('/workflows/online_users/');
            setOnlineUsers(response.data);
        } catch (error) {
            console.error('Failed to fetch online users:', error);
        } finally {
            setLoadingOnline(false);
        }
    };

    useEffect(() => {
        fetchOnlineUsers();
        // Refresh every 30 seconds
        const interval = setInterval(fetchOnlineUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleRefreshAll = () => {
        window.location.reload();
    };

    return (
        <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-lg text-text-primary">عملیات سریع</h3>
                <button 
                    onClick={handleRefreshAll}
                    className="btn-ghost !p-2"
                    title="بروزرسانی"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
                {actions.map((action, index) => (
                    <ActionButton key={index} {...action} />
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-primary-100">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-success-600" />
                        <span className="text-sm font-medium text-text-primary">کاربران آنلاین</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-success-600 font-bold">{onlineUsers.count}</span>
                    </div>
                </div>

                {loadingOnline ? (
                    <div className="text-xs text-text-secondary text-center py-2">در حال بارگذاری...</div>
                ) : !onlineUsers.users || onlineUsers.users.length === 0 ? (
                    <div className="text-xs text-text-secondary text-center py-2">هیچ کاربر آنلاینی وجود ندارد</div>
                ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {onlineUsers.users.slice(0, 10).map((user) => (
                            <div key={user.id} className="flex items-center gap-2 text-xs py-1">
                                <div className="w-6 h-6 rounded-full bg-gradient-primary flex items-center justify-center text-white font-medium text-[10px]">
                                    {user.first_name?.charAt(0) || user.username?.charAt(0) || '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-text-primary truncate font-medium">
                                        {user.first_name && user.last_name
                                            ? `${user.first_name} ${user.last_name}`
                                            : user.full_name || user.username}
                                    </div>
                                    {user.has_recent_activity && (
                                        <div className="text-[10px] text-success-600">فعال اخیر</div>
                                    )}
                                </div>
                                <div className={`w-2 h-2 rounded-full ${user.has_recent_activity ? 'bg-success-500 animate-pulse' : 'bg-primary-300'}`}></div>
                            </div>
                        ))}
                        {onlineUsers.users.length > 10 && (
                            <div className="text-xs text-text-secondary text-center pt-1">
                                و {onlineUsers.users.length - 10} کاربر دیگر...
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}