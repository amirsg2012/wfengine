// src/pages/admin/SystemLogs.jsx
import React, { useState, useEffect } from 'react';
import {
    Activity,
    Search,
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
    Eye,
    Shield,
    Key,
    Trash2,
    Filter,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import api from '../../api/client';

const ActionBadge = ({ action }) => {
    const getActionConfig = () => {
        const actionUpper = action?.toUpperCase() || '';

        if (actionUpper.includes('CREATE') || actionUpper.includes('ADD')) {
            return { icon: FileText, class: 'bg-success-100 text-success-700 border-success-200', label: 'ایجاد' };
        }
        if (actionUpper.includes('UPDATE') || actionUpper.includes('EDIT')) {
            return { icon: Settings, class: 'bg-warning-100 text-warning-700 border-warning-200', label: 'بروزرسانی' };
        }
        if (actionUpper.includes('DELETE') || actionUpper.includes('REMOVE')) {
            return { icon: Trash2, class: 'bg-error-100 text-error-700 border-error-200', label: 'حذف' };
        }
        if (actionUpper.includes('TOGGLE')) {
            return { icon: RefreshCw, class: 'bg-primary-100 text-primary-700 border-primary-200', label: 'تغییر وضعیت' };
        }
        if (actionUpper.includes('PERMISSION')) {
            return { icon: Key, class: 'bg-warning-100 text-warning-700 border-warning-200', label: 'دسترسی' };
        }
        return { icon: Activity, class: 'bg-primary-100 text-primary-700 border-primary-200', label: 'فعالیت' };
    };

    const config = getActionConfig();
    const Icon = config.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold border ${config.class}`}>
            <Icon className="w-3 h-3" />
            {action}
        </span>
    );
};

const LogCard = ({ log }) => {
    const timestamp = new Date(log.timestamp).toLocaleString('fa-IR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    return (
        <div className="card-modern p-5 hover:shadow-3d-lg transition-all duration-200 border-l-4 border-l-primary-500">
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                        <Activity className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <ActionBadge action={log.action} />
                            <span className="text-xs px-2 py-1 bg-surface-secondary rounded border border-primary-100 text-text-secondary">
                                {log.model_name}
                            </span>
                        </div>
                        <p className="text-sm text-text-primary font-medium mb-1">{log.changes}</p>
                        {log.object_id && (
                            <p className="text-xs text-text-secondary">
                                شناسه: <span className="font-mono">{log.object_id}</span>
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-primary-100">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-text-secondary">
                        <User className="w-4 h-4" />
                        <span className="font-medium">{log.user || 'سیستم'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-text-secondary">
                        <Calendar className="w-4 h-4" />
                        <span>{timestamp}</span>
                    </div>
                </div>

                {log.ip_address && (
                    <span className="text-text-secondary font-mono text-xs px-2 py-1 bg-surface-secondary rounded">
                        {log.ip_address}
                    </span>
                )}
            </div>
        </div>
    );
};

export default function SystemLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

    // Advanced filters
    const [filters, setFilters] = useState({
        action_type: '',
        date_from: '',
        date_to: '',
        user: ''
    });

    useEffect(() => {
        fetchLogs();
    }, [currentPage]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/logs/', {
                params: {
                    page: currentPage,
                    page_size: 20,
                    search: searchTerm || undefined,
                    action_type: filters.action_type || undefined,
                    date_from: filters.date_from || undefined,
                    date_to: filters.date_to || undefined,
                    user: filters.user || undefined
                }
            });

            setLogs(response.data.results || []);
            setTotalCount(response.data.count || 0);
            setTotalPages(response.data.total_pages || 1);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        setCurrentPage(1);
        fetchLogs();
    };

    const handleApplyFilters = () => {
        setCurrentPage(1);
        fetchLogs();
    };

    const handleClearFilters = () => {
        setFilters({
            action_type: '',
            date_from: '',
            date_to: '',
            user: ''
        });
        setSearchTerm('');
        setCurrentPage(1);
        setTimeout(() => fetchLogs(), 100);
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm !== undefined) {
                handleSearch();
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    if (loading && logs.length === 0) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg mx-auto mb-4">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-text-secondary font-medium">در حال بارگذاری لاگ‌های سیستم...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg">
                        <Activity className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">لاگ‌های سیستم</h1>
                        <p className="text-text-secondary mt-1">مشاهده فعالیت‌ها و تغییرات سیستم</p>
                    </div>
                </div>

                <button
                    onClick={fetchLogs}
                    className="btn-ghost flex items-center gap-2"
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    <span>بروزرسانی</span>
                </button>
            </div>

            {/* Search */}
            <div className="card-modern p-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="جستجو در لاگ‌ها (اقدام، مدل، تغییرات)..."
                            className="input-modern !pr-10"
                        />
                    </div>
                    <button
                        onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                        className="btn-ghost flex items-center gap-2"
                    >
                        <Filter className="w-4 h-4" />
                        <span>فیلتر پیشرفته</span>
                        {showAdvancedSearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <div className="text-sm text-text-secondary whitespace-nowrap">
                        {totalCount} لاگ
                    </div>
                </div>

                {/* Advanced Search Panel */}
                {showAdvancedSearch && (
                    <div className="pt-4 border-t border-primary-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Action Type Filter */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    نوع عملیات
                                </label>
                                <select
                                    value={filters.action_type}
                                    onChange={(e) => setFilters({...filters, action_type: e.target.value})}
                                    className="input-modern w-full"
                                >
                                    <option value="">همه</option>
                                    <option value="CREATE">ایجاد</option>
                                    <option value="UPDATE">بروزرسانی</option>
                                    <option value="DELETE">حذف</option>
                                    <option value="TOGGLE">تغییر وضعیت</option>
                                    <option value="PERMISSION">دسترسی</option>
                                    <option value="LOGIN">ورود</option>
                                    <option value="LOGOUT">خروج</option>
                                </select>
                            </div>

                            {/* Date From */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    از تاریخ
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                                    <input
                                        type="date"
                                        value={filters.date_from}
                                        onChange={(e) => setFilters({...filters, date_from: e.target.value})}
                                        className="input-modern w-full !pr-10"
                                    />
                                </div>
                            </div>

                            {/* Date To */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    تا تاریخ
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                                    <input
                                        type="date"
                                        value={filters.date_to}
                                        onChange={(e) => setFilters({...filters, date_to: e.target.value})}
                                        className="input-modern w-full !pr-10"
                                    />
                                </div>
                            </div>

                            {/* User Filter */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    کاربر
                                </label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                                    <input
                                        type="text"
                                        value={filters.user}
                                        onChange={(e) => setFilters({...filters, user: e.target.value})}
                                        placeholder="نام کاربری..."
                                        className="input-modern w-full !pr-10"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filter Actions */}
                        <div className="flex items-center gap-3 justify-end">
                            <button
                                onClick={handleClearFilters}
                                className="btn-ghost flex items-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                <span>پاک کردن فیلترها</span>
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                className="btn-primary flex items-center gap-2"
                            >
                                <Filter className="w-4 h-4" />
                                <span>اعمال فیلتر</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Logs List */}
            <div className="space-y-3">
                {logs.map(log => (
                    <LogCard key={log.id} log={log} />
                ))}
            </div>

            {logs.length === 0 && !loading && (
                <div className="text-center py-12">
                    <Activity className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">لاگی یافت نشد</h3>
                    <p className="text-text-secondary">
                        {searchTerm ? 'نتیجه‌ای برای جستجوی شما یافت نشد' : 'هنوز لاگی در سیستم ثبت نشده است'}
                    </p>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="card-modern p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-text-secondary">
                            نمایش {(currentPage - 1) * 20 + 1} تا {Math.min(currentPage * 20, totalCount)} از {totalCount} لاگ
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="btn-ghost px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                قبلی
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, index) => {
                                    const pageNum = index + 1;
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        Math.abs(pageNum - currentPage) <= 1
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-2 rounded-lg font-medium transition-all ${
                                                    currentPage === pageNum
                                                        ? 'bg-primary-500 text-white shadow-3d-lg'
                                                        : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-text-primary border border-primary-100'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                        return <span key={pageNum} className="px-2 text-text-secondary">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-ghost px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                بعدی
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
