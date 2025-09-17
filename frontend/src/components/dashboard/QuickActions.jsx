// src/components/dashboard/QuickActions.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
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

    const actions = [
        {
            icon: Search,
            label: 'جستجوی پیشرفته',
            onClick: () => navigate('/letters?advanced=true'),
            variant: 'default'
        },
        {
            icon: Filter,
            label: 'فیلتر درخواست‌ها',
            onClick: () => navigate('/letters?filter=true'),
            variant: 'default'
        },
        {
            icon: BarChart2,
            label: 'گزارشات',
            onClick: () => navigate('/reports'),
            variant: 'primary'
        },
        {
            icon: Download,
            label: 'دانلود آمار',
            onClick: () => {
                // Handle download
                console.log('Downloading reports...');
            },
            variant: 'default'
        },
        {
            icon: Calendar,
            label: 'تقویم کاری',
            onClick: () => navigate('/calendar'),
            variant: 'default'
        },
        {
            icon: Users,
            label: 'کاربران',
            onClick: () => navigate('/users'),
            variant: 'default'
        },
        {
            icon: Bell,
            label: 'اعلان‌ها',
            onClick: () => navigate('/notifications'),
            variant: 'default'
        },
        {
            icon: Settings,
            label: 'تنظیمات',
            onClick: () => navigate('/settings'),
            variant: 'default'
        }
    ];

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

            <div className="grid grid-cols-4 gap-3">
                {actions.map((action, index) => (
                    <ActionButton key={index} {...action} />
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-primary-100">
                <div className="flex items-center justify-between">
                    <div className="text-sm">
                        <span className="text-text-secondary">آخرین بروزرسانی: </span>
                        <span className="text-text-primary font-medium">
                            {new Date().toLocaleTimeString('fa-IR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-success-600 font-medium">آنلاین</span>
                    </div>
                </div>
            </div>
        </div>
    );
}