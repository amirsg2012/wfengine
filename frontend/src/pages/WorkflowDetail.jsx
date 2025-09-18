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

// Form Component for each form tab
const FormTab = ({ formNumber, letter, isEditable, isLocked }) => {
    const [formData, setFormData] = useState({});
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            // API call to save form data
            await api.post(`/workflows/${letter.id}/forms/${formNumber}/`, formData);
            // Show success message
        } catch (err) {
            console.error('Failed to save form:', err);
        } finally {
            setSaving(false);
        }
    };

    if (isLocked) {
        return (
            <div className="text-center py-12">
                <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-text-primary mb-2">فرم {formNumber} قفل است</h3>
                <p className="text-text-secondary">
                    این فرم تا رسیدن به مرحله مربوطه در دسترس نخواهد بود
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Form Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                    {isEditable ? <Edit className="w-5 h-5 text-primary-500" /> : <Eye className="w-5 h-5 text-gray-500" />}
                    فرم {formNumber}
                </h3>
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        isEditable ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                        {isEditable ? 'قابل ویرایش' : 'فقط خواندنی'}
                    </span>
                </div>
            </div>

            {/* Form Content */}
            <div className="card-modern p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">
                            فیلد نمونه ۱
                        </label>
                        <input
                            type="text"
                            value={formData.field1 || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, field1: e.target.value }))}
                            disabled={!isEditable}
                            className="input-modern"
                            placeholder="مقدار را وارد کنید..."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-text-primary">
                            فیلد نمونه ۲
                        </label>
                        <input
                            type="text"
                            value={formData.field2 || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, field2: e.target.value }))}
                            disabled={!isEditable}
                            className="input-modern"
                            placeholder="مقدار را وارد کنید..."
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-primary">
                        توضیحات
                    </label>
                    <textarea
                        rows={4}
                        value={formData.description || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        disabled={!isEditable}
                        className="input-modern resize-none"
                        placeholder="توضیحات تکمیلی..."
                    />
                </div>

                {isEditable && (
                    <div className="flex justify-end pt-4 border-t">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn-primary flex items-center gap-2"
                        >
                            {saving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            <span>{saving ? 'در حال ذخیره...' : 'ذخیره فرم'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

// Attachments Tab Component
const AttachmentsTab = ({ letter }) => {
    const mockAttachments = [
        { state: 'ApplicantRequest', name: 'درخواست اولیه', file: 'initial_request.pdf' },
        { state: 'Form1', name: 'فرم شماره ۱', file: 'form1_completed.pdf' },
        { state: 'Form2', name: 'مدارک هویتی', file: 'identity_docs.pdf' },
    ];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-primary-500" />
                پیوست‌ها و مدارک
            </h3>

            {mockAttachments.length > 0 ? (
                <div className="space-y-3">
                    {mockAttachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-surface rounded-xl border hover:border-primary-200 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-primary-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <StateChip label={attachment.state} size="small" />
                                        <span className="text-sm text-text-secondary">:</span>
                                        <span className="font-medium text-text-primary">{attachment.name}</span>
                                        <span className="text-sm text-text-secondary">:</span>
                                        <span className="text-sm font-mono text-primary-600">{attachment.file}</span>
                                    </div>
                                    <p className="text-xs text-text-secondary">
                                        آپلود شده در مرحله {attachment.state}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="btn-ghost !text-xs !py-1 !px-2">
                                    مشاهده
                                </button>
                                <button className="btn-ghost !text-xs !py-1 !px-2">
                                    دانلود
                                </button>
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
    const [showSensitive, setShowSensitive] = useState(false);
    const [approving, setApproving] = useState(false);
    const [workflowStatus, setWorkflowStatus] = useState(null); // ✅ NEW: Separate status state

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
                await Promise.all([fetchLetter(), fetchWorkflowStatus()]);
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

    // Dynamic tabs based on workflow state
    const getAllTabs = () => {
        const baseTabs = [
            { id: 'details', label: 'جزئیات',isLocked: false ,icon: FileText, isAvailable: true }
        ];

        // Form tabs - show based on progression
        const formTabs = [
            { id: 'form1', label: 'فرم ۱', icon: Edit, formState: 'Form1' },
            { id: 'form2', label: 'فرم ۲', icon: Edit, formState: 'Form2' },
            { id: 'form3', label: 'فرم ۳', icon: Edit, formState: 'Form3' },
            { id: 'form4', label: 'فرم ۴', icon: Edit, formState: 'Form4' }
        ];

        // Add form tabs with accessibility info
        formTabs.forEach(tab => {
            const { isLocked } = getFormAccessibility(tab.formState);
            baseTabs.push({
                ...tab,
                isAvailable: true,
                isLocked,
                icon: isLocked ? Lock : tab.icon
            });
        });

        // Always available tabs
        baseTabs.push(
            { id: 'attachments', label: 'پیوست‌ها',isLocked: false, icon: Paperclip, isAvailable: true },
            { id: 'workflow', label: 'گردش کار', isLocked: false,icon: Clock, isAvailable: true },
            { id: 'comments', label: 'نظرات', isLocked: false,icon: MessageSquare, isAvailable: true }
        );

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
                        <DetailsCard data={letter} showSensitive={showSensitive} />
                    )}
                    
                    {activeTab === 'form1' && (
                        <FormTab 
                            formNumber={1}
                            letter={letter}
                            {...getFormAccessibility('Form1')}
                        />
                    )}
                    
                    {activeTab === 'form2' && (
                        <FormTab 
                            formNumber={2}
                            letter={letter}
                            {...getFormAccessibility('Form2')}
                        />
                    )}
                    
                    {activeTab === 'form3' && (
                        <FormTab 
                            formNumber={3}
                            letter={letter}
                            {...getFormAccessibility('Form3')}
                        />
                    )}
                    
                    {activeTab === 'form4' && (
                        <FormTab 
                            formNumber={4}
                            letter={letter}
                            {...getFormAccessibility('Form4')}
                        />
                    )}

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