// src/pages/Dashboard.jsx
import React from 'react';
import { LayoutGrid, Plus } from 'lucide-react';
import useInbox from '../api/useInbox';

// Import your components
import StatWidget from '../components/dashboard/StatWidget';
import QuickActions from '../components/dashboard/QuickActions';
import RecentActivity from '../components/dashboard/RecentActivity';
import InboxWidget from '../components/dashboard/InboxWidget';

export default function Dashboard() {
    const { inboxData, stats, loading, error, refresh } = useInbox();

    if (error) {
        return (
            <div className="p-8 text-center">
                <p className="text-error-500 mb-4">{error}</p>
                <button onClick={refresh} className="btn-primary">\u062a\u0644\u0627\u0634 \u0645\u062c\u062f\u062f</button>
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
                        <h1 className="text-3xl font-bold text-text-primary">\u062f\u0627\u0634\u0628\u0648\u0631\u062f \u0627\u0635\u0644\u06cc</h1>
                        <p className="text-text-secondary mt-1">\u062e\u0644\u0627\u0635\u0647 \u0641\u0639\u0627\u0644\u06cc\u062a\u200c\u0647\u0627 \u0648 \u062f\u0633\u062a\u0631\u0633\u06cc \u0633\u0631\u06cc\u0639</p>
                    </div>
                </div>
                <button className="btn-primary flex items-center justify-center gap-2 self-start md:self-auto">
                    <Plus className="w-5 h-5" />
                    <span>\u0627\u06cc\u062c\u0627\u062f \u062f\u0631\u062e\u0648\u0627\u0633\u062a \u0641\u0648\u0631\u06cc</span>
                </button>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6">
                {/* Updated Stats */}
                <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatWidget 
                        title="\u0646\u06cc\u0627\u0632 \u0628\u0647 \u0627\u0642\u062f\u0627\u0645 \u0634\u0645\u0627" 
                        value={stats?.pending_my_action || 0} 
                        type="pending" 
                    />
                    <StatWidget 
                        title="\u062f\u0631 \u0627\u0646\u062a\u0638\u0627\u0631 \u062f\u06cc\u06af\u0631\u0627\u0646" 
                        value={stats?.pending_others || 0} 
                        type="waiting" 
                    />
                    <StatWidget 
                        title="\u062a\u06a9\u0645\u06cc\u0644 \u0634\u062f\u0647" 
                        value={stats?.completed || 0} 
                        type="done" 
                    />
                    <StatWidget 
                        title="\u06a9\u0644 \u062f\u0631\u062e\u0648\u0627\u0633\u062a\u200c\u0647\u0627" 
                        value={stats?.total_workflows || 0} 
                        type="total" 
                    />
                </div>

                {/* Inbox - Now shows workflows requiring user action */}
                <div className="col-span-12 lg:col-span-8">
                    <InboxWidget 
                        title="\u0635\u0646\u062f\u0648\u0642 \u0648\u0631\u0648\u062f\u06cc - \u0646\u06cc\u0627\u0632 \u0628\u0647 \u0627\u0642\u062f\u0627\u0645 \u0634\u0645\u0627"
                        workflows={inboxData} 
                        loading={loading} 
                        emptyMessage="\u062a\u0628\u0631\u06cc\u06a9! \u0647\u06cc\u0686 \u06a9\u0627\u0631\u06cc \u062f\u0631 \u0635\u0641 \u0627\u0646\u062a\u0638\u0627\u0631 \u0634\u0645\u0627 \u0646\u06cc\u0633\u062a."
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