// src/pages/Dashboard.jsx
import React from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import useInbox from '../api/useInbox';
import { useNavigate } from 'react-router-dom';

// Import your components
import StatWidget from '../components/dashboard/StatWidget';
import QuickActions from '../components/dashboard/QuickActions';
import RecentActivity from '../components/dashboard/RecentActivity';
import InboxWidget from '../components/dashboard/InboxWidget';

export default function Dashboard() {
    const { inboxData, stats, loading, error, refresh } = useInbox();
    const navigate = useNavigate();
    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-error-500 mb-4">{error}</p>
                <button onClick={refresh} className="btn-primary">تلاش مجدد</button>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored">
                        <LayoutGrid className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">کارتابل</h1>
                        <p className="text-text-secondary mt-1">خلاصه فعالیت‌ها و دسترسی سریع</p>
                    </div>
                </div>
                <button
                onClick={() => navigate('/workflows/create')}
                 className="btn-primary flex items-center justify-center gap-2 self-start md:self-auto">
                    <Plus className="w-5 h-5" />
                    <span>ایجاد درخواست فوری</span>
                </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6">

                {/* Inbox - Now shows workflows requiring user action */}
                <div className="col-span-12 lg:col-span-8">
                    <InboxWidget 
                        title="صندوق ورودی - نیاز به اقدام شما"
                        workflows={inboxData} 
                        loading={loading} 
                        emptyMessage="تبریک! هیچ کاری در صف انتظار شما نیست."
                        showActionButtons={true}
                    />
                </div>

                {/* Right Column */}
                <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
                    <QuickActions />
                    <RecentActivity activities={stats?.recent_activity || []} />
                </div>
            </div>
        </div>
    );
}