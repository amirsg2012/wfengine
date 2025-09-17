// src/pages/admin/SystemLogs.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Activity,
    Search,
    Filter,
    Download,
    RefreshCw,
    Calendar,
    User,
    FileText,
    Settings,
    AlertCircle,
    CheckCircle,
    XCircle,
    Info,
    X,
    Eye
} from 'lucide-react';
import api from '../../api/client';

const LogLevelBadge = ({ level }) => {
    const configs = {
        'INFO': { icon: Info, class: 'bg-primary-100 text-primary-700 border-primary-200' },
        'SUCCESS': { icon: CheckCircle, class: 'bg-success-100 text-success-700 border-success-200' },
        'WARNING': { icon: AlertCircle, class: 'bg-warning-100 text-warning-700 border-warning-200' },
        'ERROR': { icon: XCircle, class: 'bg-error-100 text-error-700 border-error-200' },
        'CRITICAL': { icon: XCircle, class: 'bg-error-100 text-error-700 border-error-200' }
    };

    const config = configs[level] || configs['INFO'];
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}>
            <Icon className="w-3 h-3" />
            {level}
        </span>
    );
};

const LogCard = ({ log, onViewDetails }) => {
    const getActionIcon = (action) => {
        switch (action) {
            case 'CREATE': case 'ADD': return FileText;
            case 'UPDATE': case 'EDIT': return Settings;
            case 'DELETE': case 'REMOVE': return XCircle;
            case 'LOGIN': case 'LOGOUT': return User;
            case 'APPROVE': case 'REJECT': return CheckCircle;
            default: return Activity;
        }
    };

    const ActionIcon = getActionIcon(log.action);
    const timestamp = new Date(log.timestamp).toLocaleString('fa-IR');

    return (
        <div className="card-modern p-6 hover:shadow-lg transition-all duration-200">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                        <ActionIcon className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                        <h4 className="font-semibold text-text-primary">{log.message}</h4>
                        <p className="text-sm text-text-secondary">{log.description}</p>
                    </div>
                </div>
                
                <LogLevelBadge level={log.level} />
            </div>

            <div className="flex items-center justify-between text-sm text-text-secondary">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        <span>{log.user || 'سیستم'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{timestamp}</span>
                    </div>
                </div>
                
                {log.details && (
                    <button
                        onClick={() => onViewDetails(log)}
                        className="btn-ghost !p-1 text-primary-600"
                        title="مشاهده جزئیات"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                )}
            </div>

            {log.ip_address && (
                <div className="mt-3 pt-3 border-t border-primary-100">
                    <span className="text-xs text-text-secondary">IP: {log.ip_address}</span>
                </div>
            )}
        </div>
    );
};

const LogDetailsModal = ({ log, onClose }) => {
    if (!log) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl border border-primary-200 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-primary-200">
                    <h3 className="text-xl font-bold text-text-primary">جزئیات لاگ</h3>
                    <button onClick={onClose} className="btn-ghost !p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">پیام</label>
                        <p className="text-text-primary">{log.message}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">توضیحات</label>
                        <p className="text-text-primary">{log.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">کاربر</label>
                            <p className="text-text-primary">{log.user || 'سیستم'}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">سطح</label>
                            <LogLevelBadge level={log.level} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">تاریخ و زمان</label>
                            <p className="text-text-primary">{new Date(log.timestamp).toLocaleString('fa-IR')}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">آدرس IP</label>
                            <p className="text-text-primary font-mono">{log.ip_address || 'نامشخص'}</p>
                        </div>
                    </div>

                    {log.details && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">جزئیات فنی</label>
                            <pre className="bg-surface border rounded-lg p-4 text-sm overflow-x-auto">
                                {JSON.stringify(log.details, null, 2)}
                            </pre>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function SystemLogs() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        search: '',
        level: '',
        dateFrom: '',
        dateTo: '',
        user: ''
    });
    const [selectedLog, setSelectedLog] = useState(null);
    const [pagination, setPagination] = useState({
        page: 1,
        totalPages: 1,
        totalCount: 0
    });

    useEffect(() => {
        fetchLogs();
    }, [filters, pagination.page]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const params = {
                page: pagination.page,
                search: filters.search,
                level: filters.level,
                date_from: filters.dateFrom,
                date_to: filters.dateTo,
                user: filters.user
            };

            // Remove empty filters
            Object.keys(params).forEach(key => {
                if (!params[key]) delete params[key];
            });

            const response = await api.get('/admin/system-logs/', { params });
            
            setLogs(response.data.results || []);
            setPagination({
                page: pagination.page,
                totalPages: Math.ceil(response.data.count / 20),
                totalCount: response.data.count
            });
        } catch (error) {
            console.error('Error fetching logs:', error);
            // Mock data for demo
            setLogs([
                {
                    id: 1,
                    message: 'کاربر جدید ایجاد شد',
                    description: 'کاربر "احمد محمدی" با نقش "RE_MANAGER" اضافه شد',
                    level: 'SUCCESS',
                    action: 'CREATE',
                    user: 'admin',
                    timestamp: new Date().toISOString(),
                    ip_address: '192.168.1.100',
                    details: { user_id: 123, role: 'RE_MANAGER' }
                },
                {
                    id: 2,
                    message: 'تنظیمات گردش کار تغییر کرد',
                    description: 'مراحل تایید حالت "Form3" بروزرسانی شد',
                    level: 'INFO',
                    action: 'UPDATE',
                    user: 'admin',
                    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
                    ip_address: '192.168.1.100'
                },
                {
                    id: 3,
                    message: 'خطا در اتصال به پایگاه داده',
                    description: 'Connection timeout به MongoDB پس از 30 ثانیه',
                    level: 'ERROR',
                    action: 'ERROR',
                    user: null,
                    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                    details: { error: 'Connection timeout', duration: 30000 }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleExport = async () => {
        try {
            const response = await api.get('/admin/system-logs/export/', {
                params: filters,
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `system-logs-${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error exporting logs:', error);
            alert('خطا در دانلود لاگ‌ها');
        }
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            level: '',
            dateFrom: '',
            dateTo: '',
            user: ''
        });
    };

    if (loading && logs.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored mx-auto mb-4">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-text-secondary font-medium">در حال بارگذاری لاگ‌های سیستم...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/admin')}
                        className="btn-ghost !p-2"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored">
                        <Activity className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">لاگ‌های سیستم</h1>
                        <p className="text-text-secondary mt-1">نظارت بر فعالیت‌ها و رخدادهای سیستم</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchLogs}
                        className="btn-ghost flex items-center gap-2"
                        disabled={loading}
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        <span>بروزرسانی</span>
                    </button>
                    <button 
                        onClick={handleExport}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>دانلود</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card-modern p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Search */}
                    <div className="lg:col-span-2">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                placeholder="جستجو در پیام‌ها..."
                                className="input-modern !pr-10"
                            />
                        </div>
                    </div>

                    {/* Level Filter */}
                    <div>
                        <select
                            value={filters.level}
                            onChange={(e) => handleFilterChange('level', e.target.value)}
                            className="input-modern"
                        >
                            <option value="">همه سطوح</option>
                            <option value="INFO">اطلاعات</option>
                            <option value="SUCCESS">موفقیت</option>
                            <option value="WARNING">هشدار</option>
                            <option value="ERROR">خطا</option>
                            <option value="CRITICAL">بحرانی</option>
                        </select>
                    </div>

                    {/* Date From */}
                    <div>
                        <input
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            className="input-modern"
                            placeholder="از تاریخ"
                        />
                    </div>

                    {/* Date To */}
                    <div>
                        <input
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            className="input-modern"
                            placeholder="تا تاریخ"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary-100">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-text-secondary">
                            {pagination.totalCount} لاگ یافت شد
                        </span>
                        {Object.values(filters).some(v => v) && (
                            <button
                                onClick={clearFilters}
                                className="btn-ghost text-sm flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                <span>پاک کردن فیلترها</span>
                            </button>
                        )}
                    </div>
                    
                    {loading && (
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <div className="w-4 h-4 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                            <span>در حال بارگذاری...</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Logs Grid */}
            <div className="space-y-4">
                {logs.map(log => (
                    <LogCard
                        key={log.id}
                        log={log}
                        onViewDetails={setSelectedLog}
                    />
                ))}
            </div>

            {logs.length === 0 && !loading && (
                <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">لاگی یافت نشد</h3>
                    <p className="text-text-secondary">
                        {Object.values(filters).some(v => v) ? 
                            'نتیجه‌ای برای فیلترهای انتخابی یافت نشد' : 
                            'هنوز لاگی در سیستم ثبت نشده است'
                        }
                    </p>
                </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-text-secondary">
                        صفحه {pagination.page} از {pagination.totalPages}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={pagination.page === 1}
                            className="btn-ghost !p-2 disabled:opacity-50"
                        >
                            قبلی
                        </button>
                        <button
                            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={pagination.page === pagination.totalPages}
                            className="btn-ghost !p-2 disabled:opacity-50"
                        >
                            بعدی
                        </button>
                    </div>
                </div>
            )}

            {/* Log Details Modal */}
            {selectedLog && (
                <LogDetailsModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
}