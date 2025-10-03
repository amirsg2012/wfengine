// src/pages/WorkflowDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FileText, 
    User, 
    Calendar, 
    Settings, 
    ArrowRight, 
    Check, 
    X, 
    AlertCircle,
    Clock,
    MessageSquare,
    Eye,
    EyeOff,
    Lock,
    Unlock,
    Edit,
    Paperclip,
    ChevronRight
} from 'lucide-react';
import api from '../api/client';
import DetailsCard from '../components/letters/DetailsCard';
import LetterHeader from '../components/letters/LetterHeader';
import StateChip from '../components/letters/StateChip';
import LetterSkeleton from '../components/letters/LetterSkeleton';
import DynamicFormRenderer from '../components/forms/DynamicFormRenderer';
import TransitionButton from '../components/workflow/TransitionButton';
import { getAvailableTransitions, getWorkflowInfo } from '../api/workflows';



// Attachments Tab Component
const AttachmentsTab = ({ letter }) => {
    const attachments = letter.attachments || [];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-primary-500" />
                پیوست‌ها و مدارک
            </h3>

            {attachments.length > 0 ? (
                <div className="space-y-3">
                    {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-4 bg-surface rounded-xl border hover:border-primary-200 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-text-primary">{attachment.name}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary">
                                        آپلود شده توسط {attachment.uploaded_by} • {new Date(attachment.uploaded_at).toLocaleDateString('fa-IR')}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={attachment.file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-ghost !text-xs !py-1 !px-2"
                                >
                                    مشاهده
                                </a>
                                <a
                                    href={attachment.file}
                                    download
                                    className="btn-ghost !text-xs !py-1 !px-2"
                                >
                                    دانلود
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-text-secondary">
                    <Paperclip className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>هیچ پیوستی موجود نیست</p>
                </div>
            )}
        </div>
    );
};

export default function WorkflowDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [letter, setLetter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [activeSubTab, setActiveSubTab] = useState(null); // For nested form tabs
    const [showSensitive, setShowSensitive] = useState(false);
    const [approving, setApproving] = useState(false);
    const [workflowStatus, setWorkflowStatus] = useState(null); // ✅ NEW: Separate status state
    const [workflowInfo, setWorkflowInfo] = useState(null); // Configurable workflow info
    const [availableTransitions, setAvailableTransitions] = useState([]); // Available transitions

    // State progression order
    const stateProgression = [
        'ApplicantRequest',
        'CEOInstruction',
        'Form1',
        'Form2', 
        'DocsCollection',
        'Form3',
        'Form4',
        'AMLForm',
        'EvaluationCommittee',
        'AppraisalFeeDeposit',
        'AppraisalNotice',
        'AppraisalOpinion',
        'AppraisalDecision',
        'Settlment'
    ];

    useEffect(() => {
        fetchLetter();
        fetchWorkflowStatus();
        fetchWorkflowInfo();
        fetchAvailableTransitions();
    }, [id]);

    const fetchLetter = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/workflows/${id}/`);
            setLetter(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'خطا در بارگذاری جزئیات درخواست');
        } finally {
            setLoading(false);
        }
    };

    // ✅ NEW: Fetch accurate workflow status including can_approve
    const fetchWorkflowStatus = async () => {
        try {
            const response = await api.get(`/workflows/${id}/status/`);
            setWorkflowStatus(response.data);
        } catch (err) {
            console.error('Error fetching workflow status:', err);
            // Don't set error here as the main workflow fetch might still succeed
        }
    };

    const fetchWorkflowInfo = async () => {
        try {
            const data = await getWorkflowInfo(id);
            setWorkflowInfo(data);
        } catch (err) {
            console.error('Error fetching workflow info:', err);
        }
    };

    const fetchAvailableTransitions = async () => {
        try {
            const data = await getAvailableTransitions(id);
            if (data.transitions) {
                setAvailableTransitions(data.transitions);
            }
        } catch (err) {
            console.error('Error fetching available transitions:', err);
            // Not a critical error - workflow might not be configurable
        }
    };

    const handleApprove = async () => {
        // ✅ IMPROVED: Use workflowStatus for accurate can_approve check
        const canApprove = workflowStatus?.can_approve || false;
        if (!canApprove) {
            console.warn('User cannot approve this workflow');
            return;
        }
        
        try {
            setApproving(true);
            // ✅ IMPROVED: Use correct parameter name
            const response = await api.post(`/workflows/${id}/perform_action/`, { 
                action: "APPROVE" 
            });
            
            if (response.data?.error) {
                console.error('Approval failed:', response.data.message);
                // Handle error (could add toast notification here)
            } else {
                // ✅ IMPROVED: Refresh both letter and status
                await Promise.all([
                    fetchLetter(),
                    fetchWorkflowStatus(),
                    fetchWorkflowInfo(),
                    fetchAvailableTransitions()
                ]);
            }
        } catch (err) {
            console.error('Approval failed:', err);
            // Handle error (could add toast notification here)
        } finally {
            setApproving(false);
        }
    };

    // ✅ IMPROVED: Use workflowStatus for approval permission checks
    const canUserApprove = () => {
        return workflowStatus?.can_approve || false;
    };

    // Determine form accessibility based on current state
    const getFormAccessibility = (formState) => {
        const currentStateIndex = stateProgression.indexOf(letter.state);
        const formStateIndex = stateProgression.indexOf(formState);
        
        if (currentStateIndex < formStateIndex) {
            return { isLocked: true, isEditable: false };
        } else if (currentStateIndex === formStateIndex) {
            return { isLocked: false, isEditable: true };
        } else {
            return { isLocked: false, isEditable: false }; // Read-only
        }
    };

    if (loading) {
        return <LetterSkeleton />;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-primary mb-2">خطا در بارگذاری</h2>
                <p className="text-text-secondary mb-6">{error}</p>
                <button 
                    onClick={() => navigate('/letters')} 
                    className="btn-primary"
                >
                    بازگشت به فهرست
                </button>
            </div>
        );
    }

    // Render form content based on tab
    const renderFormContent = (tabId, letter, accessibility) => {
        const { isLocked, isEditable } = accessibility;

        if (isLocked) {
            return (
                <div className="text-center py-12">
                    <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                        این فرم هنوز در دسترس نیست
                    </h3>
                    <p className="text-text-secondary">
                        پس از رسیدن به مرحله مربوطه، این فرم فعال خواهد شد
                    </p>
                </div>
            );
        }

        // Render forms using DynamicFormRenderer
        // Extract form number from tabId (e.g., 'form1' -> 1)
        const formNumberMatch = tabId.match(/^form(\d+)$/);
        if (formNumberMatch) {
            const formNumber = parseInt(formNumberMatch[1], 10);
            return (
                <DynamicFormRenderer
                    key={`form-${formNumber}-${letter.id}`}
                    workflowId={letter.id}
                    formNumber={formNumber}
                    readOnly={!isEditable}
                    onSubmit={() => {
                        fetchLetter();
                        fetchWorkflowStatus();
                        fetchWorkflowInfo();
                        fetchAvailableTransitions();
                    }}
                />
            );
        }

        return (
            <div className="text-center py-12">
                <p className="text-text-secondary">این فرم هنوز پیاده‌سازی نشده است</p>
            </div>
        );
    };

    // Get form tabs for the nested "مراحل فرایند" tab
    const getFormTabs = () => {
        const formTabs = [];

        // Get form tabs dynamically from workflow template if configurable
        if (workflowInfo?.configurable?.form_states) {
            // Use form states from backend
            const formStates = workflowInfo.configurable.form_states;

            formStates.forEach(formState => {
                const { isLocked } = getFormAccessibility(formState.code);
                formTabs.push({
                    id: `form${formState.form_number}`,
                    label: formState.name_fa,
                    icon: isLocked ? Lock : Edit,
                    formState: formState.code,
                    formNumber: formState.form_number,
                    isAvailable: true,
                    isLocked
                });
            });
        } else {
            // Legacy mode - show all forms
            const legacyFormTabs = [
                { id: 'form1', label: 'فرم ۱', icon: Edit, formState: 'Form1', formNumber: 1 },
                { id: 'form2', label: 'فرم ۲', icon: Edit, formState: 'Form2', formNumber: 2 },
                { id: 'form3', label: 'فرم ۳', icon: Edit, formState: 'Form3', formNumber: 3 }
            ];

            legacyFormTabs.forEach(tab => {
                const { isLocked } = getFormAccessibility(tab.formState);
                formTabs.push({
                    ...tab,
                    isAvailable: true,
                    isLocked,
                    icon: isLocked ? Lock : tab.icon
                });
            });
        }

        return formTabs;
    };

    // Dynamic tabs based on workflow state
    const getAllTabs = () => {
        const baseTabs = [
            { id: 'details', label: 'جزئیات', isLocked: false, icon: FileText, isAvailable: true },
            { id: 'process-stages', label: 'مراحل فرایند', isLocked: false, icon: Settings, isAvailable: true, hasSubTabs: true },
            { id: 'attachments', label: 'پیوست‌ها', isLocked: false, icon: Paperclip, isAvailable: true },
            { id: 'workflow', label: 'گردش کار', isLocked: false, icon: Clock, isAvailable: true },
            { id: 'comments', label: 'نظرات', isLocked: false, icon: MessageSquare, isAvailable: true }
        ];

        return baseTabs;
    };

    const tabs = getAllTabs();

    // Header actions
    const headerActions = (
        <div className="flex items-center gap-3">
            <button
                onClick={() => setShowSensitive(!showSensitive)}
                className="btn-ghost flex items-center gap-2"
            >
                {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{showSensitive ? 'مخفی کردن' : 'نمایش'} اطلاعات حساس</span>
            </button>
            
           

            {canUserApprove() && (
                <button 
                    onClick={handleApprove}
                    disabled={approving}
                    className="btn-primary mb-4"
                >
                    {approving ? 'در حال تایید...' : 'تایید درخواست'}
                </button>
            )}
        </div>
    );
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
            {/* Header using LetterHeader component */}
            <div className="flex items-center gap-3 mb-6">
                <button 
                    onClick={() => navigate('/letters')} 
                    className="btn-ghost !p-2"
                >
                    <ArrowRight className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <LetterHeader 
                        title={letter.title}
                        id={letter.id}
                        stateLabel={letter.state}
                        applicantName={letter.applicant_name}
                        createdAt={letter.created_at}
                        actions={headerActions}
                    />
                </div>
            </div>

            {/* Main Content Card */}
            <div className="card-modern !p-0 overflow-hidden">
                {/* Tab Navigation */}
                <div className="border-b-2 border-primary-100 flex items-center px-6 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => !tab.isLocked && setActiveTab(tab.id)}
                            disabled={tab.isLocked}
                            className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all duration-200 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                                    : tab.isLocked
                                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                                    : 'border-transparent text-text-secondary hover:text-primary-500 hover:bg-primary-25'
                            }`}
                        >
                            <tab.icon className={`w-5 h-5 ${tab.isLocked ? 'text-gray-400' : ''}`} />
                            <span className="font-medium">{tab.label}</span>
                            {tab.isLocked && <Lock className="w-3 h-3 text-gray-400" />}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <DetailsCard data={letter} showSensitive={showSensitive} />

                            {/* Required Approver Info */}
                            {workflowStatus?.required_approver && (
                                <div className="card-modern bg-amber-50 border-amber-200">
                                    <h3 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        تایید مورد نیاز
                                    </h3>
                                    <div className="text-sm text-amber-800">
                                        <p className="mb-1">
                                            <span className="font-semibold">نقش:</span> {workflowStatus.required_approver.role_name_fa || workflowStatus.required_approver.role_code}
                                        </p>
                                        {workflowStatus.required_approver.step_name_fa && (
                                            <p>
                                                <span className="font-semibold">مرحله:</span> {workflowStatus.required_approver.step_name_fa}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Available Transitions (for configurable workflows) */}
                            {workflowInfo?.is_configurable && availableTransitions.length > 0 && (
                                <div className="card-modern">
                                    <h3 className="text-lg font-bold text-text-primary mb-4">
                                        انتقال‌های موجود
                                    </h3>
                                    <div className="space-y-3">
                                        {availableTransitions.map((transition) => (
                                            <TransitionButton
                                                key={transition.id}
                                                workflow={letter}
                                                transition={transition}
                                                onTransitionComplete={async () => {
                                                    await Promise.all([
                                                        fetchLetter(),
                                                        fetchWorkflowStatus(),
                                                        fetchWorkflowInfo(),
                                                        fetchAvailableTransitions()
                                                    ]);
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Process Stages Tab with nested form tabs */}
                    {activeTab === 'process-stages' && (() => {
                        const formTabs = getFormTabs();
                        const currentSubTab = activeSubTab || formTabs[0]?.id;

                        return (
                            <div className="space-y-4">
                                {/* Sub-tabs for forms */}
                                <div className="flex gap-2 border-b pb-2">
                                    {formTabs.map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveSubTab(tab.id)}
                                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
                                                currentSubTab === tab.id
                                                    ? 'bg-primary-500 text-white'
                                                    : 'text-text-secondary hover:bg-surface'
                                            }`}
                                        >
                                            {React.createElement(tab.icon, { className: 'w-4 h-4' })}
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Sub-tab content */}
                                {formTabs.map((tab) => {
                                    if (currentSubTab !== tab.id) return null;
                                    const formState = tab.formState || tab.id.replace('form', 'Form');
                                    return (
                                        <div key={tab.id}>
                                            {renderFormContent(tab.id, letter, getFormAccessibility(formState))}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {activeTab === 'attachments' && (
                        <AttachmentsTab letter={letter} />
                    )}
                    
                    {activeTab === 'workflow' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-primary-500" />
                                وضعیت گردش کار
                            </h3>
                            <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-primary-700">وضعیت فعلی:</span>
                                    <StateChip label={letter.state} />
                                </div>
                                {letter.pending_step !== undefined && letter.total_steps_in_state && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-primary-700">مرحله:</span>
                                        <span className="text-sm text-primary-600">
                                            {letter.pending_step + 1} از {letter.total_steps_in_state}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {letter.can_approve && (
                                <div className="bg-success-50 rounded-xl p-4 border border-success-200">
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-success-600" />
                                        <span className="text-sm font-medium text-success-700">
                                            شما می‌توانید این درخواست را به مرحله بعد پیشبرد کنید
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'comments' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5 text-primary-500" />
                                نظرات و تاریخچه
                            </h3>
                            <div className="text-center py-8 text-text-secondary">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>هنوز نظری ثبت نشده است</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="bg-surface border-t rounded-b-2xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button className="btn-ghost text-sm px-4 py-2">
                            چاپ
                        </button>
                        <button className="btn-ghost text-sm px-4 py-2">
                            دانلود
                        </button>
                    </div>
                    
                    <div className="text-xs text-text-secondary">
                        آخرین بروزرسانی: {new Date(letter.updated_at).toLocaleDateString('fa-IR')}
                    </div>
                </div>
            </div>
        </div>
    );
}