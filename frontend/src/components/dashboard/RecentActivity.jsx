// src/components/dashboard/RecentActivity.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Clock, 
    FileText, 
    Check, 
    ArrowRight, 
    User,
    Calendar,
    Eye,
    MoreVertical
} from 'lucide-react';
import api from '../../api/client';

const ActivityItem = ({ activity, onView }) => {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'created': return FileText;
            case 'approved': return Check;
            case 'forwarded': return ArrowRight;
            case 'completed': return Check;
            default: return Clock;
        }
    };

    const getActivityColor = (type) => {
        switch (type) {
            case 'created': return 'text-primary-600 bg-primary-100';
            case 'approved': return 'text-success-600 bg-success-100';
            case 'forwarded': return 'text-warning-600 bg-warning-100';
            case 'completed': return 'text-secondary-600 bg-secondary-100';
            default: return 'text-text-secondary bg-gray-100';
        }
    };

    const getActivityText = (type) => {
        switch (type) {
            case 'created': return 'ایجاد شد';
            case 'approved': return 'تایید شد';
            case 'forwarded': return 'ارجاع شد';
            case 'completed': return 'تکمیل شد';
            default: return 'بروزرسانی شد';
        }
    };

    const Icon = getActivityIcon(activity.type);
    const colorClass = getActivityColor(activity.type);
    const actionText = getActivityText(activity.type);

    return (
        <div className="flex items-start gap-4 p-3 rounded-xl bg-primary-25 border border-primary-100 hover:bg-primary-50 transition-colors group">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass} flex-shrink-0`}>
                <Icon className="w-4 h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">
                            {activity.title || 'درخواست بدون عنوان'}
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                            {actionText} توسط {activity.user_name || 'کاربر ناشناس'}
                        </p>
                    </div>
                    
                    <button
                        onClick={() => onView(activity.letter_id)}
                        className="opacity-0 group-hover:opacity-100 btn-ghost !p-1 text-xs transition-opacity"
                        title="مشاهده جزئیات"
                    >
                        <Eye className="w-3 h-3" />
                    </button>
                </div>
                
                <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(activity.created_at).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(activity.created_at).toLocaleTimeString('fa-IR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                        })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function RecentActivity() {
    const navigate = useNavigate();
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRecentActivities();
    }, []);

    const fetchRecentActivities = async () => {
        try {
            setLoading(true);
            const response = await api.get('/letters/recent-activity/', {
                params: { limit: 10 }
            });
            setActivities(response.data.results || []);
        } catch (err) {
            console.error('Error fetching recent activities:', err);
            // Fallback to mock data for demo
            setActivities([
                {
                    id: 1,
                    letter_id: '1',
                    title: 'درخواست تأیید مدرک تحصیلی',
                    type: 'created',
                    user_name: 'احمد محمدی',
                    created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString()
                },
                {
                    id: 2,
                    letter_id: '2',
                    title: 'درخواست گواهی کار',
                    type: 'approved',
                    user_name: 'مریم احمدی',
                    created_at: new Date(Date.now() - 12 * 60 * 1000).toISOString()
                },
                {
                    id: 3,
                    letter_id: '3',
                    title: 'درخواست مرخصی',
                    type: 'forwarded',
                    user_name: 'علی رضایی',
                    created_at: new Date(Date.now() - 23 * 60 * 1000).toISOString()
                },
                {
                    id: 4,
                    letter_id: '4',
                    title: 'درخواست تغییر واحد',
                    type: 'completed',
                    user_name: 'فاطمه کریمی',
                    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString()
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleViewActivity = (letterId) => {
        navigate(`/letters/${letterId}`);
    };

    const handleViewAll = () => {
        navigate('/letters?view=recent');
    };

    if (loading) {
        return (
            <div className="card-modern p-6">
                <div className="animate-pulse space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="skeleton-shimmer h-6 w-32"></div>
                        <div className="skeleton-shimmer h-8 w-20 rounded-lg"></div>
                    </div>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex items-start gap-4">
                            <div className="skeleton-shimmer w-8 h-8 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                                <div className="skeleton-shimmer h-4 w-3/4"></div>
                                <div className="skeleton-shimmer h-3 w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="card-modern p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-text-primary">فعالیت‌های اخیر</h3>
                        <p className="text-sm text-text-secondary">آخرین تغییرات و بروزرسانی‌ها</p>
                    </div>
                </div>
                
                <button 
                    onClick={handleViewAll}
                    className="btn-ghost text-sm"
                >
                    مشاهده همه
                </button>
            </div>

            <div className="space-y-3">
                {activities.length > 0 ? (
                    activities.map((activity) => (
                        <ActivityItem 
                            key={activity.id} 
                            activity={activity} 
                            onView={handleViewActivity} 
                        />
                    ))
                ) : (
                    <div className="text-center py-8">
                        <Clock className="w-12 h-12 text-text-secondary mx-auto mb-3 opacity-50" />
                        <p className="text-text-secondary">هیچ فعالیت اخیری یافت نشد</p>
                    </div>
                )}
            </div>

            {activities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-primary-100">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-text-secondary">
                            {activities.length} فعالیت اخیر نمایش داده شده
                        </span>
                        <button 
                            onClick={fetchRecentActivities}
                            className="text-primary-600 hover:text-primary-700 font-medium"
                        >
                            بروزرسانی
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}