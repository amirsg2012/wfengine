// src/pages/Reports.jsx
import React, { useState, useEffect } from 'react';
import {
    BarChart2,
    TrendingUp,
    Clock,
    CheckCircle,
    FileText,
    Activity,
    Loader,
    ArrowUpRight,
    Package
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import StateChip from '../components/letters/StateChip';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => {
    const colorClasses = {
        primary: 'bg-primary-100 text-primary-600',
        success: 'bg-success-100 text-success-600',
        warning: 'bg-warning-100 text-warning-600',
        info: 'bg-info-100 text-info-600'
    };

    return (
        <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
            <div>
                <h3 className="text-3xl font-bold text-text-primary mb-1">{value}</h3>
                <p className="text-sm font-medium text-text-secondary">{title}</p>
                {subtitle && <p className="text-xs text-text-tertiary mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

export default function Reports() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchReportData();
    }, []);

    const fetchReportData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get('/workflows/reports/');
            setReportData(response.data);
        } catch (err) {
            console.error('Error fetching reports:', err);
            setError('خطا در بارگذاری گزارش‌ها');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (error || !reportData) {
        return (
            <div className="p-8 text-center">
                <p className="text-error-600">{error || 'خطا در بارگذاری گزارش‌ها'}</p>
            </div>
        );
    }

    const { summary, by_state, by_action_type, recent_workflows } = reportData;

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">گزارش‌ها و آمار</h1>
                    <p className="text-text-secondary mt-1">آمار و گزارش‌های فعالیت شما در سیستم</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="کل پردازش‌ها"
                    value={summary.total_processed}
                    icon={FileText}
                    color="primary"
                    subtitle="تعداد کل درخواست‌های پردازش شده"
                />
                <StatCard
                    title="تکمیل شده"
                    value={summary.completed}
                    icon={CheckCircle}
                    color="success"
                    subtitle={`نرخ تکمیل: ${summary.completion_rate}%`}
                />
                <StatCard
                    title="در حال انجام"
                    value={summary.in_progress}
                    icon={Clock}
                    color="warning"
                    subtitle="درخواست‌های در جریان"
                />
                <StatCard
                    title="نرخ موفقیت"
                    value={`${summary.completion_rate}%`}
                    icon={TrendingUp}
                    color="info"
                    subtitle="درصد تکمیل کل"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* State Distribution */}
                <div className="card-modern">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                            <Package className="w-5 h-5 text-primary-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-text-primary">توزیع بر اساس وضعیت</h3>
                            <p className="text-sm text-text-secondary">تعداد درخواست‌ها در هر مرحله</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {by_state && by_state.length > 0 ? (
                            by_state.slice(0, 8).map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-surface rounded-lg border hover:border-primary-200 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <StateChip label={item.state} size="small" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl font-bold text-text-primary">{item.count}</span>
                                        <span className="text-xs text-text-secondary">درخواست</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-text-secondary py-8">داده‌ای موجود نیست</p>
                        )}
                    </div>
                </div>

                {/* Action Type Distribution */}
                <div className="card-modern">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-info-100 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-info-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-text-primary">نوع فعالیت‌ها</h3>
                            <p className="text-sm text-text-secondary">تعداد اقدامات انجام شده</p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {by_action_type && by_action_type.length > 0 ? (
                            by_action_type.map((item, index) => {
                                const actionLabels = {
                                    'APPROVE': 'تأیید',
                                    'UPLOAD': 'آپلود فایل',
                                    'COMMENT': 'نظر'
                                };
                                return (
                                    <div key={index} className="flex items-center justify-between p-3 bg-surface rounded-lg border">
                                        <span className="text-sm font-medium text-text-primary">
                                            {actionLabels[item.action_type] || item.action_type}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold text-primary-600">{item.count}</span>
                                            <span className="text-xs text-text-secondary">عملیات</span>
                                        </div>
                                    </div>
                                );
                            })
                        ) : (
                            <p className="text-center text-text-secondary py-8">داده‌ای موجود نیست</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Recent Workflows */}
            <div className="card-modern">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-success-100 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-success-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary">آخرین درخواست‌های پردازش شده</h3>
                        <p className="text-sm text-text-secondary">۱۰ درخواست اخیر شما</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b">
                                <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">عنوان</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">متقاضی</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">وضعیت</th>
                                <th className="text-right py-3 px-4 text-sm font-semibold text-text-secondary">تاریخ بروزرسانی</th>
                                <th className="text-center py-3 px-4 text-sm font-semibold text-text-secondary">عملیات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent_workflows && recent_workflows.length > 0 ? (
                                recent_workflows.map((workflow) => (
                                    <tr key={workflow.id} className="border-b hover:bg-primary-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-medium text-text-primary">{workflow.title}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm text-text-secondary">{workflow.applicant_name || '-'}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <StateChip label={workflow.state} size="small" />
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="text-sm text-text-secondary">
                                                {new Date(workflow.updated_at).toLocaleDateString('fa-IR')}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <Link
                                                to={`/workflows/${workflow.id}`}
                                                className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
                                            >
                                                مشاهده
                                                <ArrowUpRight className="w-4 h-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="text-center py-8 text-text-secondary">
                                        هیچ درخواستی یافت نشد
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
