// src/pages/admin/WorkflowConfiguration.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GitBranch,
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    ArrowRight,
    ArrowDown,
    Move,
    Users,
    Settings,
    AlertCircle,
    CheckCircle,
    Clock
} from 'lucide-react';
import api from '../../api/client';

const StateCard = ({ state, stateConfig, roles, onEditSteps, onUpdateOwner, isActive, onClick }) => {
    const stateNameMap = {
        'ApplicantRequest': 'درخواست متقاضی',
        'CEOInstruction': 'دستورالعمل مدیرعامل',
        'Form1': 'فرم ۱',
        'Form2': 'فرم ۲',
        'DocsCollection': 'جمع‌آوری مدارک',
        'Form3': 'فرم ۳',
        'Form4': 'فرم ۴',
        'AMLForm': 'فرم AML',
        'EvaluationCommittee': 'کمیته ارزیابی',
        'AppraisalFeeDeposit': 'واریز کارمزد ارزیابی',
        'AppraisalNotice': 'اعلان ارزیابی',
        'AppraisalOpinion': 'نظر ارزیاب',
        'AppraisalDecision': 'تصمیم ارزیابی',
        'Settlment': 'تسویه شده'
    };

    const steps = stateConfig?.steps || [];
    const stateName = stateNameMap[state] || state;

    return (
        <div 
            className={`card-modern p-6 cursor-pointer transition-all duration-200 hover:shadow-lg ${
                isActive ? 'border-l-4 border-l-primary-500 bg-primary-25' : ''
            }`}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="font-bold text-lg text-text-primary">{stateName}</h3>
                    <p className="text-sm text-text-secondary">{state}</p>
                </div>
                
                <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                        steps.length > 0 ? 'bg-success-100 text-success-700' : 'bg-warning-100 text-warning-700'
                    }`}>
                        {steps.length} مرحله
                    </span>
                </div>
            </div>

            {/* Steps Preview */}
            <div className="space-y-2 mb-4">
                {steps.slice(0, 3).map((step, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center text-xs font-medium text-primary-600">
                            {index + 1}
                        </div>
                        <span className="text-text-secondary">
                            {step.map(roleCode => {
                                const role = roles.find(r => r.code === roleCode);
                                return role?.name_fa || roleCode;
                            }).join(' یا ')}
                        </span>
                    </div>
                ))}
                {steps.length > 3 && (
                    <div className="text-xs text-text-secondary">
                        + {steps.length - 3} مرحله دیگر
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onEditSteps(state);
                    }}
                    className="btn-primary text-xs flex items-center gap-1 flex-1"
                >
                    <Edit className="w-3 h-3" />
                    <span>ویرایش مراحل</span>
                </button>
            </div>
        </div>
    );
};

const StepEditor = ({ state, stateConfig, roles, onSave, onClose }) => {
    const [steps, setSteps] = useState(stateConfig?.steps || [[]]);
    const [loading, setLoading] = useState(false);

    const stateNameMap = {
        'ApplicantRequest': 'درخواست متقاضی',
        'CEOInstruction': 'دستورالعمل مدیرعامل',
        'Form1': 'فرم ۱',
        'Form2': 'فرم ۲',
        'DocsCollection': 'جمع‌آوری مدارک',
        'Form3': 'فرم ۳',
        'Form4': 'فرم ۴',
        'AMLForm': 'فرم AML',
        'EvaluationCommittee': 'کمیته ارزیابی',
        'AppraisalFeeDeposit': 'واریز کارمزد ارزیابی',
        'AppraisalNotice': 'اعلان ارزیابی',
        'AppraisalOpinion': 'نظر ارزیاب',
        'AppraisalDecision': 'تصمیم ارزیابی',
        'Settlment': 'تسویه شده'
    };

    const addStep = () => {
        setSteps([...steps, []]);
    };

    const removeStep = (index) => {
        if (steps.length > 1) {
            setSteps(steps.filter((_, i) => i !== index));
        }
    };

    const updateStep = (stepIndex, roleCode, checked) => {
        const newSteps = [...steps];
        if (checked) {
            newSteps[stepIndex] = [...newSteps[stepIndex], roleCode];
        } else {
            newSteps[stepIndex] = newSteps[stepIndex].filter(r => r !== roleCode);
        }
        setSteps(newSteps);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await onSave(state, steps);
            onClose();
        } catch (error) {
            console.error('Error saving steps:', error);
            alert('خطا در ذخیره تنظیمات');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
            
            <div className="relative bg-white rounded-2xl shadow-2xl border border-primary-200 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-primary-200">
                    <div>
                        <h3 className="text-xl font-bold text-text-primary">ویرایش مراحل تایید</h3>
                        <p className="text-sm text-text-secondary mt-1">
                            {stateNameMap[state] || state}
                        </p>
                    </div>
                    <button onClick={onClose} className="btn-ghost !p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-text-primary">مراحل تایید</h4>
                            <button onClick={addStep} className="btn-primary text-sm flex items-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>افزودن مرحله</span>
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            {steps.map((step, stepIndex) => (
                                <div key={stepIndex} className="border border-primary-200 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <h5 className="font-medium text-text-primary">
                                            مرحله {stepIndex + 1}
                                        </h5>
                                        {steps.length > 1 && (
                                            <button
                                                onClick={() => removeStep(stepIndex)}
                                                className="btn-ghost !p-1 text-error-600"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {roles.map(role => (
                                            <label key={role.code} className="flex items-center gap-3 p-2 rounded hover:bg-primary-25">
                                                <input
                                                    type="checkbox"
                                                    checked={step.includes(role.code)}
                                                    onChange={(e) => updateStep(stepIndex, role.code, e.target.checked)}
                                                    className="w-4 h-4 text-primary-600 rounded border-primary-300"
                                                />
                                                <div>
                                                    <span className="text-sm font-medium text-text-primary">{role.name_fa}</span>
                                                    <p className="text-xs text-text-secondary">{role.group.name_fa}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                    
                                    {step.length === 0 && (
                                        <div className="text-center py-4 text-warning-600 bg-warning-50 rounded border border-warning-200 mt-3">
                                            <AlertCircle className="w-5 h-5 mx-auto mb-2" />
                                            <p className="text-sm">لطفا حداقل یک نقش برای این مرحله انتخاب کنید</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="bg-surface border rounded-lg p-4">
                        <h5 className="font-medium text-text-primary mb-3">پیش‌نمایش گردش کار</h5>
                        <div className="flex items-center gap-2 flex-wrap">
                            {steps.map((step, index) => (
                                <React.Fragment key={index}>
                                    <div className="flex items-center gap-2 bg-primary-100 px-3 py-2 rounded-lg">
                                        <div className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </div>
                                        <span className="text-sm font-medium text-primary-700">
                                            {step.length > 0 ? 
                                                step.map(roleCode => {
                                                    const role = roles.find(r => r.code === roleCode);
                                                    return role?.name_fa || roleCode;
                                                }).join(' / ') :
                                                'نقش انتخاب نشده'
                                            }
                                        </span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <ArrowRight className="w-4 h-4 text-text-secondary" />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-primary-200 mt-6">
                        <button onClick={onClose} className="btn-ghost">
                            انصراف
                        </button>
                        <button 
                            onClick={handleSave} 
                            disabled={loading || steps.some(step => step.length === 0)}
                            className="btn-primary flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>در حال ذخیره...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>ذخیره تنظیمات</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function WorkflowConfiguration() {
    const navigate = useNavigate();
    const [workflowConfig, setWorkflowConfig] = useState({});
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedState, setSelectedState] = useState(null);
    const [showStepEditor, setShowStepEditor] = useState(false);

    const stateOrder = [
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
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [configRes, rolesRes] = await Promise.all([
                api.get('/admin/workflow-config/'),
                api.get('/admin/roles/')
            ]);
            setWorkflowConfig(configRes.data);
            setRoles(rolesRes.data.results || []);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Mock data for demo
            setRoles([
                { code: 'CEO_MANAGER', name_fa: 'مدیرعامل', group: { name_fa: 'مدیریت' }},
                { code: 'RE_MANAGER', name_fa: 'معاونت املاک', group: { name_fa: 'املاک' }},
                { code: 'FA_ACCOUNTING_LEAD', name_fa: 'مدیریت حسابداری', group: { name_fa: 'مالی' }}
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSteps = async (state, steps) => {
        try {
            await api.put('/admin/workflow-config/', {
                state,
                steps
            });
            
            // Update local state
            setWorkflowConfig(prev => ({
                ...prev,
                [state]: { ...prev[state], steps }
            }));
        } catch (error) {
            throw error;
        }
    };

    const handleEditSteps = (state) => {
        setSelectedState(state);
        setShowStepEditor(true);
    };

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg shadow-colored mx-auto mb-4">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-text-secondary font-medium">در حال بارگذاری تنظیمات گردش کار...</p>
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
                        <GitBranch className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">تنظیمات گردش کار</h1>
                        <p className="text-text-secondary mt-1">پیکربندی مراحل تایید و مالکیت حالت‌ها</p>
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-primary-600 mt-0.5" />
                <div>
                    <h4 className="font-medium text-primary-700">نکته مهم</h4>
                    <p className="text-sm text-primary-600 mt-1">
                        تغییر در مراحل تایید بر روی درخواست‌های جدید اعمال می‌شود. درخواست‌های در حال پردازش تحت تأثیر قرار نمی‌گیرند.
                    </p>
                </div>
            </div>

            {/* States Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stateOrder.map(state => (
                    <StateCard
                        key={state}
                        state={state}
                        stateConfig={workflowConfig[state]}
                        roles={roles}
                        onEditSteps={handleEditSteps}
                        isActive={selectedState === state}
                        onClick={() => setSelectedState(state)}
                    />
                ))}
            </div>

            {/* Step Editor Modal */}
            {showStepEditor && selectedState && (
                <StepEditor
                    state={selectedState}
                    stateConfig={workflowConfig[selectedState]}
                    roles={roles}
                    onSave={handleSaveSteps}
                    onClose={() => {
                        setShowStepEditor(false);
                        setSelectedState(null);
                    }}
                />
            )}
        </div>
    );
}