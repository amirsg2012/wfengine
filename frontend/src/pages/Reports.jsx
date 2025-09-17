// src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import { 
    BarChart2, 
    TrendingUp, 
    Clock, 
    Users, 
    FileText, 
    Calendar,
    Download,
    Filter
} from 'lucide-react';
import api from '../api/client';

const StatCard = ({ title, value, change, icon: Icon, trend = 'up' }) => (
    <div className="card-modern p-6">
        <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                trend === 'up' ? 'bg-success-100' : 'bg-warning-100'
            }`}>
                <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-success-600' : 'text-warning-600'}`} />
            </div>
            {change && (
                <div className={`flex items-center gap-1 text-sm font-medium ${
                    trend === 'up' ? 'text-success-600' : 'text-warning-600'
                }`}>
                    <TrendingUp className="w-4 h-4" />
                    <span>{change}</span>
                </div>
            )}
        </div>
        <div>
            <h3 className="text-2xl font-bold text-text-primary mb-1">{value}</h3>
            <p className="text-sm text-text-secondary">{title}</p>
        </div>
    </div>
);

export default function Reports() {
    const [stats, setStats] = useState({
        total_letters: 0,
        pending_letters: 0,
        completed_this_month: 0,
        avg_processing_time: 0
    });
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('month');

    useEffect(() => {
        fetchReportData();
    }, [timeRange]);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/letters/reports/', {
                params: { period: timeRange }
            });
            setStats(response.data);
        } catch (err) {
            console.error('Error fetching report data:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
                <div className="skeleton-shimmer h-8 w-48"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="skeleton-shimmer h-32 rounded-2xl"></div>
                    ))}
                </div>
                <div className="skeleton-shimmer h-96 rounded-2xl"></div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored">
                        <BarChart2 className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">گزارشات و آمار</h1>
                        <p className="text-text-secondary mt-1">آمار عملکرد و گزارش‌های سیستم</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <select 
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="input-modern !py-3"
                    >
                        <option value="week">هفته گذشته</option>
                        <option value="month">ماه گذشته</option>
                        <option value="quarter">سه ماه گذشته</option>
                        <option value="year">سال گذشته</option>
                    </select>
                    
                    <button className="btn-primary flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>دانلود گزارش</span>
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="کل درخواست‌ها"
                    value={stats.total_letters?.toLocaleString('fa-IR') || '0'}
                    change="+12%"
                    icon={FileText}
                    trend="up"
                />
                <StatCard
                    title="در انتظار تایید"
                    value={stats.pending_letters?.toLocaleString('fa-IR') || '0'}
                    change="-5%"
                    icon={Clock}
                    trend="down"
                />
                <StatCard
                    title="تکمیل شده (ماه جاری)"
                    value={stats.completed_this_month?.toLocaleString('fa-IR') || '0'}
                    change="+18%"
                    icon={TrendingUp}
                    trend="up"
                />
                <StatCard
                    title="متوسط زمان پردازش"
                    value={`${stats.avg_processing_time || 0} روز`}
                    change="-2 روز"
                    icon={Calendar}
                    trend="up"
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Workflow Status Chart */}
                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-text-primary">وضعیت درخواست‌ها</h3>
                        <Filter className="w-5 h-5 text-text-secondary" />
                    </div>
                    
                    <div className="space-y-4">
                        {[
                            { label: 'ثبت شده', count: 45, color: 'bg-primary-500' },
                            { label: 'در حال بررسی', count: 23, color: 'bg-warning-500' },
                            { label: 'تایید شده', count: 67, color: 'bg-success-500' },
                            { label: 'رد شده', count: 8, color: 'bg-error-500' }
                        ].map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-4 h-4 rounded-full ${item.color}`}></div>
                                    <span className="text-sm font-medium text-text-primary">{item.label}</span>
                                </div>
                                <span className="text-sm font-bold text-text-primary">{item.count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Processing Time Chart */}
                <div className="card-modern p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-text-primary">زمان پردازش</h3>
                        <Users className="w-5 h-5 text-text-secondary" />
                    </div>
                    
                    <div className="space-y-4">
                        {[
                            { department: '\u0648\u0627\u062d\u062f \u0645\u0627\u0644\u06cc', avg_time: '2.3 \u0631\u0648\u0632', progress: 75 },
                            { department: '\u0648\u0627\u062d\u062f \u0641\u0646\u06cc', avg_time: '1.8 \u0631\u0648\u0632', progress: 90 },
                            { department: '\u0645\u062f\u06cc\u0631\u06cc\u062a', avg_time: '3.1 \u0631\u0648\u0632', progress: 60 },
                            { department: '\u0645\u0646\u0627\u0628\u0639 \u0627\u0646\u0633\u0627\u0646\u06cc', avg_time: '1.5 \u0631\u0648\u0632', progress: 95 }
                        ].map((item, index) => (
                            <div key={index} className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-text-primary">{item.department}</span>
                                    <span className="text-sm text-text-secondary">{item.avg_time}</span>
                                </div>
                                <div className="w-full bg-primary-100 rounded-full h-2">
                                    <div 
                                        className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${item.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="card-modern p-6">
                <h3 className="text-xl font-bold text-text-primary mb-6">فعالیت‌های اخیر</h3>
                
                <div className="space-y-4">
                    {[
                        { action: 'درخواست جدید ثبت شد', user: 'احمد خان', time: '5 دقیقه پیش', type: 'new' },
                        { action: 'درخواست تایید شد', user: 'مریم احمدی', time: '12 ساعت ئیش', type: 'approved' },
                    ].map((activity, index) => (
                        <div key={index} className="flex items-center gap-4 p-3 rounded-xl bg-primary-25 border border-primary-100">
                            <div className={`w-2 h-2 rounded-full ${
                                activity.type === 'new' ? 'bg-primary-500' :
                                activity.type === 'approved' ? 'bg-success-500' :
                                activity.type === 'forwarded' ? 'bg-warning-500' :
                                'bg-secondary-500'
                            }`}></div>
                            
                            <div className="flex-1">
                                <p className="text-sm font-medium text-text-primary">{activity.action}</p>
                                <p className="text-xs text-text-secondary">توسط {activity.user}</p>
                            </div>
                            
                            <span className="text-xs text-text-secondary">{activity.time}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}