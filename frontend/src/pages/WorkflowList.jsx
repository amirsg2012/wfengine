// src/pages/WorkflowList.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
    FileText,
    Plus,
    RefreshCw,
    Eye,
    ChevronRight,
    ChevronLeft,
    Inbox,
    AlertCircle,
    FilterX,
    Search,
    X,
    Calendar
} from 'lucide-react';
import api from '../api/client';
import DatePicker from "@hassanmojab/react-modern-calendar-datepicker";
import 'react-modern-calendar-datepicker/lib/DatePicker.css';

// Modal Overlay Component
const Modal = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
            
            {/* Modal */}
            <div 
                className="relative bg-white rounded-2xl shadow-2xl border border-primary-200 max-w-md w-full animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-primary-200">
                    <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                {/* Content */}
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// Create the modal date range picker component
const JalaliDateRangePicker = ({ fromValue, toValue, onFromChange, onToChange }) => {
    const [showModal, setShowModal] = useState(false);
    const [tempRange, setTempRange] = useState({ from: '', to: '' });

    // Initialize temp range when modal opens
    useEffect(() => {
        if (showModal) {
            setTempRange({ from: fromValue || '', to: toValue || '' });
        }
    }, [showModal, fromValue, toValue]);

    // Convert ISO dates to calendar format
    const parseToCalendarDate = (isoDate) => {
        if (!isoDate) return null;
        const date = new Date(isoDate);

        const jalaliParts = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(date);

        const year = parseInt(jalaliParts.find(part => part.type === 'year')?.value);
        const month = parseInt(jalaliParts.find(part => part.type === 'month')?.value);
        const day = parseInt(jalaliParts.find(part => part.type === 'day')?.value);

        return { year, month, day };
    };

    // Convert calendar date to ISO format
    const formatToISO = (calendarDate) => {
        if (!calendarDate || !calendarDate.year) return '';

        try {
            // Simple conversion - for production use a proper Jalali library
            const baseJalali = { year: 1400, month: 1, day: 1 };
            const baseGregorian = new Date('2021-03-21');

            const daysDiff = (calendarDate.year - baseJalali.year) * 365 +
                (calendarDate.month - baseJalali.month) * 30 +
                (calendarDate.day - baseJalali.day);

            const result = new Date(baseGregorian);
            result.setDate(result.getDate() + daysDiff);

            return result.toISOString().split('T')[0];
        } catch (error) {
            return '';
        }
    };

    // Format display value
    const formatDisplayValue = () => {
        if (!fromValue && !toValue) return '';

        const formatJalali = (isoDate) => {
            if (!isoDate) return '';
            return new Date(isoDate).toLocaleDateString('fa-IR');
        };

        if (fromValue && toValue) {
            return `${formatJalali(fromValue)} - ${formatJalali(toValue)}`;
        } else if (fromValue) {
            return `از ${formatJalali(fromValue)}`;
        } else if (toValue) {
            return `تا ${formatJalali(toValue)}`;
        }
        return '';
    };

    // Handle range selection in modal
    const handleRangeChange = (range) => {
        setTempRange({
            from: range.from ? formatToISO(range.from) : '',
            to: range.to ? formatToISO(range.to) : ''
        });
    };

    // Apply the selected range
    const handleApply = () => {
        onFromChange(tempRange.from);
        onToChange(tempRange.to);
        setShowModal(false);
    };

    // Clear selection
    const handleClear = (e) => {
        e.stopPropagation();
        onFromChange('');
        onToChange('');
    };

    // Clear temp selection in modal
    const handleClearModal = () => {
        setTempRange({ from: '', to: '' });
    };

    const currentRange = {
        from: parseToCalendarDate(tempRange.from),
        to: parseToCalendarDate(tempRange.to)
    };

    return (
        <>
            <div
                className="input-modern w-full text-xs cursor-pointer flex items-center justify-between hover:border-primary-400 transition-colors"
                onClick={() => setShowModal(true)}
            >
                <span className={`${!fromValue && !toValue ? 'text-gray-400' : 'text-gray-700'}`}>
                    {formatDisplayValue() || 'انتخاب بازه تاریخ...'}
                </span>
                <div className="flex items-center gap-1">
                    {(fromValue || toValue) && (
                        <button
                            onClick={handleClear}
                            className="text-gray-400 hover:text-red-500 text-xs transition-colors"
                            type="button"
                        >
                            ✕
                        </button>
                    )}
                    <Calendar className="w-4 h-4 text-gray-400" />
                </div>
            </div>

            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title="انتخاب بازه تاریخ"
            >
                <div className="space-y-6">
                    {/* Current Selection Display */}
                    <div className="text-center p-3 bg-primary-50 rounded-lg border border-primary-200">
                        <p className="text-sm text-text-secondary mb-1">بازه انتخاب شده:</p>
                        <p className="text-text-primary font-medium">
                            {tempRange.from && tempRange.to 
                                ? `${new Date(tempRange.from).toLocaleDateString('fa-IR')} - ${new Date(tempRange.to).toLocaleDateString('fa-IR')}`
                                : tempRange.from 
                                ? `از ${new Date(tempRange.from).toLocaleDateString('fa-IR')}`
                                : tempRange.to
                                ? `تا ${new Date(tempRange.to).toLocaleDateString('fa-IR')}`
                                : 'هیچ تاریخی انتخاب نشده'
                            }
                        </p>
                    </div>

                    {/* Date Picker */}
                    <div className="flex justify-center">
                        <DatePicker
                            value={currentRange}
                            onChange={handleRangeChange}
                            shouldHighlightWeekends
                            locale="fa"
                            calendarClassName="shadow-none border-0"
                            renderInput={() => null}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-3 pt-4 border-t border-primary-200">
                        <button
                            onClick={handleClearModal}
                            className="btn-ghost text-error-600 hover:bg-error-50 flex-1"
                        >
                            پاک کردن
                        </button>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="btn-ghost px-6"
                            >
                                انصراف
                            </button>
                            <button
                                onClick={handleApply}
                                className="btn-primary px-6"
                            >
                                اعمال
                            </button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
};

// Debounce hook
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
};

// --- Sub-components ---

const Header = ({ onNewClick, count }) => (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored">
                <FileText className="w-7 h-7 text-white" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-text-primary">لیست گردش کار</h1>
                <p className="text-text-secondary mt-1">
                    مدیریت و پیگیری {count > 0 ? `${count} درخواست` : 'درخواست‌های'} ثبت شده
                </p>
            </div>
        </div>
        <button onClick={onNewClick} className="btn-primary flex items-center justify-center gap-2 self-start md:self-auto">
            <Plus className="w-5 h-5" />
            <span>درخواست جدید</span>
        </button>
    </header>
);

const TableActions = ({ onRefresh, onClearFilters, hasFilters, loading }) => (
    <div className="flex items-center justify-between p-4 bg-primary-50/40 border-b">
        <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">اعمال فیلتر در ستون‌ها:</span>
            <Search className="w-4 h-4 text-text-secondary" />
        </div>
        <div className="flex items-center gap-2">
            {hasFilters && (
                <button
                    onClick={onClearFilters}
                    className="btn-ghost text-error-600 hover:bg-error-50 text-sm"
                >
                    <FilterX className="w-4 h-4 mr-1" />
                    پاک کردن فیلترها
                </button>
            )}
            <button
                onClick={onRefresh}
                disabled={loading}
                className="btn-ghost text-sm"
            >
                <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                بروزرسانی
            </button>
        </div>
    </div>
);

const TableHeader = ({ filters, onFilterChange, onClearFilters }) => {
    const workflowStates = [
        'ApplicantRequest', 'CEOInstruction', 'Form1', 'Form2',
        'DocsCollection', 'Form3', 'Form4', 'AMLForm',
        'EvaluationCommittee', 'AppraisalFeeDeposit', 'AppraisalNotice',
        'AppraisalOpinion', 'AppraisalDecision', 'Settlment'
    ];

    return (
        <thead className=" sticky top-0 z-10">
        {/* Column Headers */}
        <tr className="text-text-secondary font-semibold text-sm border-b border-primary-200">
            <th className="p-4 text-right font-semibold">عنوان درخواست</th>
            <th className="p-4 text-center font-semibold">نام متقاضی</th>
            <th className="p-4 text-center font-semibold">کد ملی</th>
            <th className="p-4 text-center font-semibold">وضعیت</th>
            <th className="p-4 text-center font-semibold">تاریخ ایجاد</th>
            <th className="p-4 text-center font-semibold">عملیات</th>
        </tr>

        {/* Filter Row */}
        <tr className="border-b">
            {/* Title Filter */}
            <th className="p-3">
                <input
                    type="text"
                    className="input-modern w-full text-sm"
                    placeholder="جستجو در عنوان..."
                    value={filters.title}
                    onChange={(e) => onFilterChange('title', e.target.value)}
                />
            </th>

            {/* Applicant Name Filter */}
            <th className="p-3">
                <input
                    type="text"
                    className="input-modern w-full text-center text-sm"
                    placeholder="نام متقاضی..."
                    value={filters.applicant_name}
                    onChange={(e) => onFilterChange('applicant_name', e.target.value)}
                />
            </th>

            {/* National ID Filter */}
            <th className="p-3">
                <input
                    type="text"
                    maxLength={10}
                    className="input-modern w-full text-center text-sm font-mono"
                    placeholder="کد ملی..."
                    value={filters.applicant_national_id}
                    onChange={(e) => {
                        // Only allow numbers
                        const value = e.target.value.replace(/\D/g, '');
                        onFilterChange('applicant_national_id', value);
                    }}
                />
            </th>

            {/* State Filter */}
            <th className="p-3">
                <select
                    className="input-modern w-full text-center text-sm"
                    value={filters.state}
                    onChange={(e) => onFilterChange('state', e.target.value)}
                >
                    <option value="">همه وضعیت‌ها</option>
                    {workflowStates.map(state => (
                        <option key={state} value={state}>{state}</option>
                    ))}
                </select>
            </th>

            {/* Date Range Filter - Updated with Modal DatePicker */}
            <th className="p-3">
                <JalaliDateRangePicker
                    fromValue={filters.created_from}
                    toValue={filters.created_to}
                    onFromChange={(value) => onFilterChange('created_from', value)}
                    onToChange={(value) => onFilterChange('created_to', value)}
                />
            </th>

            {/* Actions Column */}
            <th className="p-3">
                <div className="flex justify-center">
                    <button
                        onClick={onClearFilters}
                        className="btn-ghost text-xs text-error-600 hover:bg-error-50"
                        title="پاک کردن تمام فیلترها"
                    >
                        <FilterX className="w-3 h-3" />
                    </button>
                </div>
            </th>
        </tr>
        </thead>
    );
};

const WorkflowRow = ({ workflow, index }) => {
    const navigate = useNavigate();

    const getStateColor = (state) => {
        const stateColors = {
            'ApplicantRequest': 'badge-warning',
            'CEOInstruction': 'badge-info',
            'Settlment': 'badge-success'
        };
        return stateColors[state] || 'badge-info';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fa-IR');
    };

    const formatNationalId = (id) => {
        if (!id) return '-';
        return id.length > 4 ? `****${id.slice(-4)}` : id;
    };

    return (
        <tr
            className="hover:bg-primary-50/60 transition-colors duration-200 animate-fade-in-up border-b"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            {/* Title and Body */}
            <td className="p-4 align-top">
                <div className="font-semibold text-text-primary truncate" title={workflow.title || 'بدون عنوان'}>
                    {workflow.title || 'بدون عنوان'}
                </div>
                <div className="text-sm text-text-secondary line-clamp-1 mt-1">
                    {workflow.body || 'توضیحات ندارد'}
                </div>
            </td>

            {/* Applicant Name */}
            <td className="p-4 text-center">
                <span className="text-sm text-text-primary font-medium">
                    {workflow.applicant_name || workflow.created_by || 'نامشخص'}
                </span>
            </td>

            {/* National ID */}
            <td className="p-4 text-center">
                <span className="text-sm text-text-secondary font-mono">
                    {formatNationalId(workflow.applicant_national_id)}
                </span>
            </td>

            {/* State */}
            <td className="p-4 text-center">
                <span className={`${getStateColor(workflow.state)} text-xs`}>
                    {workflow.state}
                </span>
            </td>

            {/* Created Date */}
            <td className="p-4 text-center">
                <span className="text-sm text-text-secondary">
                    {formatDate(workflow.created_at)}
                </span>
            </td>

            {/* Actions */}
            <td className="p-4 text-center">
                <button
                    onClick={() => navigate(`/workflows/${workflow.id}`)}
                    className="btn-ghost flex items-center gap-2 !py-2 !px-3 text-sm hover:bg-primary-100 mx-auto"
                >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">مشاهده</span>
                </button>
            </td>
        </tr>
    );
};

const EmptyTableBody = ({ hasFilters, onClearFilters, loading, error, onRetry }) => {
    if (loading) {
        return (
            <tbody>
            {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b">
                    <td className="p-4">
                        <div className="w-3/4 h-5 skeleton-shimmer mb-2" />
                        <div className="w-1/2 h-4 skeleton-shimmer" />
                    </td>
                    <td className="p-4 text-center">
                        <div className="w-20 h-4 skeleton-shimmer mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                        <div className="w-16 h-4 skeleton-shimmer mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                        <div className="w-24 h-6 skeleton-shimmer !rounded-full mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                        <div className="w-20 h-4 skeleton-shimmer mx-auto" />
                    </td>
                    <td className="p-4 text-center">
                        <div className="w-20 h-8 skeleton-shimmer !rounded-xl mx-auto" />
                    </td>
                </tr>
            ))}
            </tbody>
        );
    }

    if (error) {
        return (
            <tbody>
            <tr>
                <td colSpan={6} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-4">
                        <AlertCircle className="w-12 h-12 text-error-500" />
                        <h3 className="text-lg font-semibold text-text-primary">خطا در بارگذاری اطلاعات</h3>
                        <p className="text-text-secondary">{error}</p>
                        <button onClick={onRetry} className="btn-primary">
                            تلاش مجدد
                        </button>
                    </div>
                </td>
            </tr>
            </tbody>
        );
    }

    return (
        <tbody>
        <tr>
            <td colSpan={6} className="p-12 text-center">
                <div className="flex flex-col items-center gap-4">
                    <Inbox className="w-12 h-12 text-text-secondary/50" />
                    <div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            {hasFilters ? 'نتیجه‌ای با این فیلترها یافت نشد' : 'هنوز هیچ درخواستی ثبت نشده'}
                        </h3>
                        <p className="text-text-secondary">
                            {hasFilters
                                ? 'فیلترهای اعمال شده را تغییر دهید یا پاک کنید'
                                : 'اولین درخواست خود را ایجاد کنید'
                            }
                        </p>
                    </div>
                    {hasFilters && (
                        <button onClick={onClearFilters} className="btn-primary">
                            پاک کردن فیلترها
                        </button>
                    )}
                </div>
            </td>
        </tr>
        </tbody>
    );
};

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            const start = Math.max(1, currentPage - 2);
            const end = Math.min(totalPages, start + maxVisible - 1);

            for (let i = start; i <= end; i++) {
                pages.push(i);
            }
        }

        return pages;
    };

    return (
        <div className="card-modern mt-6">
            <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                    <span className="text-sm text-text-secondary">
                        نمایش {startItem} تا {endItem} از {totalItems} مورد
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onPageChange(1)}
                        disabled={currentPage === 1}
                        className="btn-ghost !p-2 disabled:opacity-50 text-sm"
                        title="صفحه اول"
                    >
                        اول
                    </button>

                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="btn-ghost !p-2 disabled:opacity-50"
                        title="صفحه قبل"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>

                    {getPageNumbers().map(page => (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            className={`btn-ghost !p-2 min-w-[32px] text-sm ${
                                currentPage === page ? 'bg-primary-100 text-primary-700 font-semibold' : ''
                            }`}
                        >
                            {page}
                        </button>
                    ))}

                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="btn-ghost !p-2 disabled:opacity-50"
                        title="صفحه بعد"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onPageChange(totalPages)}
                        disabled={currentPage === totalPages}
                        className="btn-ghost !p-2 disabled:opacity-50 text-sm"
                        title="صفحه آخر"
                    >
                        آخر
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Component ---

export default function WorkflowList() {
    const navigate = useNavigate();
    const [workflows, setWorkflows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        title: '',
        applicant_name: '',
        applicant_national_id: '',
        state: '',
        created_from: '',
        created_to: '',
        updated_from: '',
        updated_to: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;

    const debouncedFilters = useDebounce(filters, 500);

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1); // Reset to first page when filters change
    };

    const handleClearFilters = () => {
        setFilters({
            title: '',
            applicant_name: '',
            applicant_national_id: '',
            state: '',
            created_from: '',
            created_to: '',
            updated_from: '',
            updated_to: ''
        });
        setCurrentPage(1);
    };

    const loadWorkflows = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // Build query parameters for backend
            const params = new URLSearchParams();
            Object.entries(debouncedFilters).forEach(([key, value]) => {
                if (!value) return;
                if (/_from$|_to$/.test(key)) {
                    params.append(key, value);
                } else if (key === 'title') {
                    params.append('search', value);
                }
            });

            const res = await api.get(`/workflows/?${params.toString()}`);
            setWorkflows(Array.isArray(res.data.results) ? res.data.results : Array.isArray(res.data) ? res.data : []);
        } catch (e) {
            console.error('Failed to load workflows:', e);
            const errorMsg = e?.response?.data?.detail || 'خطا در بارگذاری اطلاعات';
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    }, [debouncedFilters]);

    useEffect(() => {
        loadWorkflows();
    }, [loadWorkflows]);

    // Client-side filtering for fields not handled by backend
    const filteredWorkflows = useMemo(() => {
        return workflows.filter(workflow => {
            const applicantNameMatch = !debouncedFilters.applicant_name ||
                (workflow.applicant_name || workflow.created_by || '').toLowerCase().includes(debouncedFilters.applicant_name.toLowerCase());

            const nationalIdMatch = !debouncedFilters.applicant_national_id ||
                (workflow.applicant_national_id || '').includes(debouncedFilters.applicant_national_id);

            const stateMatch = !debouncedFilters.state || workflow.state === debouncedFilters.state;

            return applicantNameMatch && nationalIdMatch && stateMatch;
        });
    }, [workflows, debouncedFilters]);

    const paginatedWorkflows = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredWorkflows.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredWorkflows, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage);
    const hasFilters = Object.values(debouncedFilters).some(v => v);
    const hasData = filteredWorkflows.length > 0;

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            <Header
                onNewClick={() => navigate('/workflows/new')}
                count={filteredWorkflows.length}
            />

            <div className="card-modern !p-0 overflow-hidden">
                <TableActions
                    onRefresh={loadWorkflows}
                    onClearFilters={handleClearFilters}
                    hasFilters={hasFilters}
                    loading={loading}
                />

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <TableHeader
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onClearFilters={handleClearFilters}
                        />

                        {hasData ? (
                            <tbody className="divide-y divide-gray-200">
                            {paginatedWorkflows.map((workflow, index) => (
                                <WorkflowRow
                                    key={workflow.id}
                                    workflow={workflow}
                                    index={index}
                                />
                            ))}
                            </tbody>
                        ) : (
                            <EmptyTableBody
                                hasFilters={hasFilters}
                                onClearFilters={handleClearFilters}
                                loading={loading}
                                error={error}
                                onRetry={loadWorkflows}
                            />
                        )}
                    </table>
                </div>
            </div>

            {/* Pagination outside the table */}
            {hasData && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    totalItems={filteredWorkflows.length}
                    itemsPerPage={itemsPerPage}
                />
            )}
        </div>
    );
}