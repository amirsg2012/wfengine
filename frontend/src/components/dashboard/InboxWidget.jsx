// src/components/dashboard/InboxWidget.jsx
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Search, Inbox, Eye, FileText } from 'lucide-react';

export default function InboxWidget({ 
    title = "صندوق ورودی",
    workflows = [],
    loading = false,
    emptyMessage = "صندوق ورودی خالی است",
    showActionButtons = false 
}) {
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');

    // Filter logic for workflows
    const filteredWorkflows = useMemo(() => {
        let filtered = workflows;
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(workflow =>
                workflow.title?.toLowerCase().includes(lowercasedTerm) ||
                workflow.applicant_name?.toLowerCase().includes(lowercasedTerm) ||
                workflow.body?.toLowerCase().includes(lowercasedTerm) ||
                workflow.state?.toLowerCase().includes(lowercasedTerm) ||
                workflow.applicant_national_id?.includes(lowercasedTerm)
            );
        }
        if (selectedFilter !== 'all') {
            // Filter by urgency based on workflow state
            const getUrgency = (workflow) => {
                if (['ApplicantRequest', 'CEOInstruction'].includes(workflow.state)) return 'high';
                if (['Form1', 'Form2', 'Form3', 'Form4'].includes(workflow.state)) return 'medium';
                return 'low';
            };
            filtered = filtered.filter(workflow => getUrgency(workflow) === selectedFilter);
        }
        return filtered;
    }, [workflows, searchTerm, selectedFilter]);

    const RequestCard = ({ workflow, onClick, showActionButtons = false }) => {
        // Priority styles based on workflow urgency
        const priorityStyles = {
            high: 'bg-error-100 text-error-700 border border-error-200',
            medium: 'bg-warning-100 text-warning-700 border border-warning-200',
            low: 'bg-success-100 text-success-700 border border-success-200'
        };

        const priorityText = {
            high: 'فوری',
            medium: 'متوسط',
            low: 'عادی'
        };

        // Determine urgency based on state
        const getUrgency = (workflow) => {
            if (['ApplicantRequest', 'CEOInstruction'].includes(workflow.state)) return 'high';
            if (['Form1', 'Form2', 'Form3', 'Form4'].includes(workflow.state)) return 'medium';
            return 'low';
        };

        const urgency = getUrgency(workflow);
        const applicantName = workflow.applicant_name || workflow.created_by || 'ناشناس';
        const createdDate = new Date(workflow.created_at).toLocaleDateString('fa-IR');

        const handleCardClick = () => {
            if (onClick) {
                onClick(workflow);
            } else {
                navigate(`/workflows/${workflow.id}`);
            }
        };

        const handleApproveClick = (e) => {
            e.stopPropagation(); // Prevent card click
            navigate(`/workflows/${workflow.id}?action=approve`);
        };

        const handleReviewClick = (e) => {
            e.stopPropagation(); // Prevent card click
            navigate(`/workflows/${workflow.id}`);
        };

        return (
            <div
                className="bg-surface border-2 border-primary-100 hover:border-primary-300 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-1 cursor-pointer group"
                onClick={handleCardClick}
            >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {applicantName.charAt(0)}
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary text-sm group-hover:text-primary-600 transition-colors">
                                {applicantName}
                            </h3>
                            <p className="text-xs text-text-secondary font-medium">{createdDate}</p>
                        </div>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-bold ${priorityStyles[urgency]}`}>
                        {priorityText[urgency]}
                    </div>
                </div>

                {/* Content */}
                <div className="mb-4">
                    <h4 className="font-bold text-text-primary mb-2 line-clamp-1 group-hover:text-primary-600 transition-colors">
                        {workflow.title || 'بدون عنوان'}
                    </h4>
                    <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                        {workflow.body || 'توضیحات در دسترس نیست.'}
                    </p>
                </div>

                {/* Workflow State Info */}
                <div className="mb-3 p-2 bg-primary-50 rounded-lg border">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-primary-700 font-medium">وضعیت فعلی:</span>
                        <span className="text-primary-600 font-bold">{workflow.state}</span>
                    </div>
                    {workflow.pending_step !== undefined && workflow.total_steps_in_state && (
                        <div className="flex items-center justify-between text-xs mt-1">
                            <span className="text-primary-700">مرحله:</span>
                            <span className="text-primary-600">{workflow.pending_step + 1} از {workflow.total_steps_in_state}</span>
                        </div>
                    )}
                </div>

                {/* Action Buttons (if enabled) */}
                {showActionButtons && workflow.can_approve && (
                    <div className="flex gap-2 mb-3">
                        <button
                            className="btn-primary text-xs flex-1 py-2"
                            onClick={handleApproveClick}
                        >
                            تأیید و ارسال
                        </button>
                        <button 
                            className="btn-ghost text-xs px-3 py-2"
                            onClick={handleReviewClick}
                        >
                            بررسی جزئیات
                        </button>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t-2 border-primary-100">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-text-secondary" />
                            <span className="text-xs text-text-secondary font-medium">
                                {workflow.applicant_national_id ? 'کد ملی: ' + workflow.applicant_national_id.slice(-4) : 'عمومی'}
                            </span>
                        </div>
                        {workflow.attachments && workflow.attachments.length > 0 && (
                            <div className="w-2 h-2 bg-primary-500 rounded-full" title="دارای پیوست"></div>
                        )}
                        {urgency === 'high' && (
                            <div className="w-2 h-2 bg-error-500 rounded-full animate-pulse" title="فوری"></div>
                        )}
                    </div>
                    <button className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-bold transition-colors">
                        <Eye className="w-3 h-3" />
                        <span>مشاهده</span>
                    </button>
                </div>
            </div>
        );
    };

    const LoadingSkeleton = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-primary-50 rounded-xl p-4 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-primary-200 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 bg-primary-200 rounded w-3/4"></div>
                            <div className="h-3 bg-primary-100 rounded w-1/2"></div>
                        </div>
                        <div className="w-12 h-6 bg-primary-200 rounded"></div>
                    </div>
                    <div className="h-4 bg-primary-200 rounded w-full mb-2"></div>
                    <div className="h-4 bg-primary-100 rounded w-5/6 mb-3"></div>
                    <div className="h-8 bg-primary-200 rounded w-full"></div>
                </div>
            ))}
        </div>
    );

    if (loading) {
        return (
            <div className="card-modern">
                <div className="flex items-center gap-3 mb-6">
                    <Inbox className="w-6 h-6 text-primary-500" />
                    <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                </div>
                <LoadingSkeleton />
            </div>
        );
    }

    return (
        <div className="card-modern">
            <div className="flex items-center gap-3 mb-6">
                <Inbox className="w-6 h-6 text-primary-500" />
                <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                {workflows.length > 0 && (
                    <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-sm font-medium">
                        {filteredWorkflows.length}
                    </span>
                )}
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    <input
                        type="text"
                        placeholder="جستجو در درخواست‌ها (نام، عنوان، کد ملی، وضعیت)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="input-modern !pr-10"
                    />
                </div>
                <select
                    value={selectedFilter}
                    onChange={(e) => setSelectedFilter(e.target.value)}
                    className="input-modern !w-auto min-w-[140px]"
                >
                    <option value="all">همه اولویت‌ها</option>
                    <option value="high">فوری</option>
                    <option value="medium">متوسط</option>
                    <option value="low">عادی</option>
                </select>
            </div>

            {/* Content */}
            {filteredWorkflows.length === 0 ? (
                <div className="text-center py-12">
                    <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Inbox className="w-8 h-8 text-primary-500" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary mb-2">
                        {workflows.length === 0 ? 'صندوق ورودی خالی است' : 'نتیجه‌ای یافت نشد'}
                    </h3>
                    <p className="text-text-secondary font-medium">
                        {searchTerm || selectedFilter !== 'all'
                            ? 'هیچ درخواستی با این فیلتر یافت نشد.'
                            : emptyMessage
                        }
                    </p>
                    {(searchTerm || selectedFilter !== 'all') && (
                        <button
                            onClick={() => { setSearchTerm(''); setSelectedFilter('all'); }}
                            className="btn-ghost mt-4 !text-sm"
                        >
                            پاک کردن فیلترها
                        </button>
                    )}
                </div>
            ) : (
                <>
                    {/* Workflows Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        {filteredWorkflows.slice(0, 6).map((workflow) => (
                            <RequestCard 
                                key={workflow.id} 
                                workflow={workflow} 
                                showActionButtons={showActionButtons}
                            />
                        ))}
                    </div>

                    {/* Show more button if there are more workflows */}
                    {filteredWorkflows.length > 6 && (
                        <div className="text-center pt-4 border-t-2 border-primary-100">
                            <button 
                                className="btn-ghost"
                                onClick={() => navigate('/workflows', { 
                                    state: { searchTerm, filter: selectedFilter } 
                                })}
                            >
                                مشاهده {filteredWorkflows.length - 6} درخواست دیگر
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

InboxWidget.propTypes = {
    title: PropTypes.string,
    workflows: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        title: PropTypes.string,
        body: PropTypes.string,
        state: PropTypes.string,
        applicant_name: PropTypes.string,
        applicant_national_id: PropTypes.string,
        created_by: PropTypes.string,
        created_at: PropTypes.string,
        updated_at: PropTypes.string,
        attachments: PropTypes.array,
        pending_step: PropTypes.number,
        total_steps_in_state: PropTypes.number,
        can_approve: PropTypes.bool,
        urgency: PropTypes.oneOf(['high', 'medium', 'low']),
    })),
    loading: PropTypes.bool,
    emptyMessage: PropTypes.string,
    showActionButtons: PropTypes.bool,
};