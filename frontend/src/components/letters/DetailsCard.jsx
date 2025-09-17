// src/components/letters/DetailsCard.jsx
import React, { useState } from 'react';
import {
    Info, List, Code, User, Calendar, FileText, Settings, Eye, EyeOff
} from 'lucide-react';
import StateChip from './StateChip';

const renderValue = (value) => {
    if (value === null || value === undefined) {
        return <span className="text-text-secondary italic">خالی</span>;
    }
    if (typeof value === 'boolean') {
        return <span className={`badge-${value ? 'success' : 'error'} text-xs`}>{value ? 'بله' : 'خیر'}</span>;
    }
    if (Array.isArray(value)) {
        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {value.map((item, idx) => (
                    <span key={idx} className="badge-info text-xs">{String(item)}</span>
                ))}
            </div>
        );
    }
    if (typeof value === 'object') {
        return (
            <div className="bg-surface border rounded-lg p-3 mt-2 text-xs space-y-2">
                {Object.entries(value).slice(0, 5).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                        <span className="font-mono text-text-secondary flex-shrink-0 min-w-[60px]">{k}:</span>
                        <span className="font-mono text-text-primary break-words">{renderValue(v)}</span>
                    </div>
                ))}
                {Object.keys(value).length > 5 && (
                    <div className="text-text-secondary italic">... و {Object.keys(value).length - 5} مورد دیگر</div>
                )}
            </div>
        );
    }
    return <span className="break-words">{String(value)}</span>;
};

const formatDate = (dateString) => {
    if (!dateString) return 'نامشخص';
    const date = new Date(dateString);
    return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const FormattedView = ({ data, showSensitive }) => {
    // Filter out sensitive data unless explicitly requested
    const filteredData = { ...data };
    if (!showSensitive) {
        delete filteredData.id;
        delete filteredData.created_by;
        delete filteredData.attachments;
        delete filteredData.comments;
    }

    const categories = {
        workflow: {
            title: 'اطلاعات گردش کار',
            icon: FileText,
            fields: ['title', 'body', 'state'],
            formatters: {
                title: (value) => <span className="font-semibold text-primary-600">{value}</span>,
                body: (value) => <div className="text-sm bg-primary-50 p-2 rounded border">{value || 'توضیحاتی وجود ندارد'}</div>,
                state: (value) => <span className="badge-info"><StateChip label={value}/></span>
            }
        },
        applicant: {
            title: 'اطلاعات متقاضی',
            icon: User,
            fields: ['applicant_name', 'applicant_national_id'],
            formatters: {
                applicant_name: (value) => <span className="font-medium">{value}</span>,
                applicant_national_id: (value) => <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{value}</span>
            }
        },
        dates: {
            title: 'تاریخ‌ها',
            icon: Calendar,
            fields: ['created_at', 'updated_at'],
            formatters: {
                created_at: formatDate,
                updated_at: formatDate
            }
        }
    };

    // Only show system info if sensitive data is enabled
    if (showSensitive) {
        categories.system = {
            title: 'اطلاعات سیستم',
            icon: Settings,
            fields: ['id', 'created_by'],
            formatters: {
                id: (value) => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{value}</span>,
                created_by: (value) => <span className="text-sm">{value}</span>
            }
        };
    }

    const categorizedData = Object.keys(categories).reduce((acc, key) => {
        const category = { ...categories[key], data: {} };
        let hasData = false;
        category.fields.forEach(field => {
            if (filteredData[field] !== undefined && filteredData[field] !== null && filteredData[field] !== '') {
                category.data[field] = filteredData[field];
                hasData = true;
            }
        });
        if (hasData) acc[key] = category;
        return acc;
    }, {});

    return (
        <div className="space-y-4">
            {Object.values(categorizedData).map(category => (
                <div key={category.title} className="border border-primary-200 rounded-xl overflow-hidden">
                    <div className="bg-primary-50 px-4 py-3 border-b border-primary-200">
                        <div className="flex items-center gap-2 font-semibold text-text-primary">
                            <category.icon className="w-5 h-5 text-primary-600" />
                            <span>{category.title}</span>
                            <span className="text-xs bg-primary-200 text-primary-700 px-2 py-1 rounded-full">
                                {Object.keys(category.data).length}
                            </span>
                        </div>
                    </div>
                    <div className="p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {Object.entries(category.data).map(([key, value]) => (
                                <div key={key} className="space-y-1">
                                    <label className="text-sm font-medium text-text-secondary block">
                                        {key === 'applicant_name' ? 'نام متقاضی' :
                                         key === 'applicant_national_id' ? 'کد ملی' :
                                         key === 'created_at' ? 'تاریخ ایجاد' :
                                         key === 'updated_at' ? 'آخرین بروزرسانی' :
                                         key === 'created_by' ? 'ایجاد شده توسط' :
                                         key === 'title' ? 'عنوان' :
                                         key === 'body' ? 'توضیحات' :
                                         key === 'state' ? 'وضعیت فعلی' :
                                         key}:
                                    </label>
                                    <div className="text-text-primary">
                                        {category.formatters?.[key] ? category.formatters[key](value) : renderValue(value)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default function DetailsCard({ data, displayMode = "user" }) {
    const [viewMode, setViewMode] = useState('formatted');
    const [showSensitive, setShowSensitive] = useState(false);

    // Don't show raw data in user mode
    const canShowRaw = displayMode !== "clean";

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary-500" />
                    <span>اطلاعات درخواست</span>
                </h3>
                <div className="flex items-center gap-2">
                    {/* Toggle sensitive data visibility */}
                    <button
                        onClick={() => setShowSensitive(!showSensitive)}
                        className="btn-ghost !text-xs !py-2 !px-3"
                        title={showSensitive ? 'مخفی کردن اطلاعات سیستم' : 'نمایش اطلاعات سیستم'}
                    >
                        {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{showSensitive ? 'مخفی' : 'سیستم'}</span>
                    </button>
                    
                    {/* View mode toggle */}
                    {canShowRaw && (
                        <div className="flex items-center gap-1 bg-surface p-1 rounded-lg">
                            <button
                                onClick={() => setViewMode('formatted')}
                                className={`btn-ghost !text-xs !py-1 !px-3 ${
                                    viewMode === 'formatted' ? '!bg-white !text-primary-600 shadow-sm' : ''
                                }`}
                            >
                                <List className="w-3 h-3" />
                                <span>منظم</span>
                            </button>
                            <button
                                onClick={() => setViewMode('raw')}
                                className={`btn-ghost !text-xs !py-1 !px-3 ${
                                    viewMode === 'raw' ? '!bg-white !text-primary-600 shadow-sm' : ''
                                }`}
                            >
                                <Code className="w-3 h-3" />
                                <span>خام</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {viewMode === 'formatted' ? (
                <FormattedView data={data} showSensitive={showSensitive} />
            ) : (
                <div className="border rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">نمایش خام JSON</span>
                    </div>
                    <pre className="bg-gray-900 text-green-400 text-xs p-4 overflow-auto max-h-96 font-mono">
                        {JSON.stringify(data, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
}