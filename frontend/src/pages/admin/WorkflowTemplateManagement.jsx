// src/pages/admin/WorkflowTemplateManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    GitBranch,
    Edit2,
    Save,
    X,
    Plus,
    Trash2,
    ArrowRight,
    Loader,
    Check,
    AlertCircle
} from 'lucide-react';
import api from '../../api/client';

export default function WorkflowTemplateManagement() {
    const [template, setTemplate] = useState(null);
    const [states, setStates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingState, setEditingState] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);

    useEffect(() => {
        fetchTemplate();
    }, []);

    const fetchTemplate = async () => {
        try {
            setLoading(true);
            // Fetch the default template
            const templatesResponse = await api.get('/workflow-templates/');
            const defaultTemplate = templatesResponse.data.find(t => t.code === 'PROPERTY_ACQUISITION');

            if (defaultTemplate) {
                setTemplate(defaultTemplate);

                // Fetch states for this template
                const statesResponse = await api.get(`/workflow-templates/${defaultTemplate.id}/states/`);
                setStates(statesResponse.data.sort((a, b) => a.order - b.order));
            }
        } catch (error) {
            console.error('Error fetching template:', error);
            setSaveError('خطا در بارگذاری اطلاعات');
        } finally {
            setLoading(false);
        }
    };

    const handleEditState = (state) => {
        setEditingState(state.id);
        setEditForm({
            name: state.name,
            name_fa: state.name_fa,
            description: state.description || ''
        });
    };

    const handleCancelEdit = () => {
        setEditingState(null);
        setEditForm({});
    };

    const handleSaveState = async (stateId) => {
        try {
            setSaving(true);
            setSaveError(null);

            await api.patch(`/workflow-templates/states/${stateId}/`, editForm);

            // Refresh states
            await fetchTemplate();

            setEditingState(null);
            setEditForm({});
            setSaveSuccess(true);

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            console.error('Error saving state:', error);
            setSaveError('خطا در ذخیره تغییرات');
        } finally {
            setSaving(false);
        }
    };

    const getStateTypeLabel = (type) => {
        const labels = {
            'FORM': 'فرم',
            'APPROVAL': 'تأیید',
            'DECISION': 'تصمیم‌گیری',
            'ACTION': 'اقدام'
        };
        return labels[type] || type;
    };

    const getStateTypeColor = (type) => {
        const colors = {
            'FORM': 'bg-primary-100 text-primary-700 border-primary-200',
            'APPROVAL': 'bg-warning-100 text-warning-700 border-warning-200',
            'DECISION': 'bg-info-100 text-info-700 border-info-200',
            'ACTION': 'bg-success-100 text-success-700 border-success-200'
        };
        return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!template) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-error-500" />
                <p className="text-error-600">الگوی پیش‌فرض گردش کار یافت نشد</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">مدیریت گردش کار</h1>
                    <p className="text-text-secondary mt-1">ویرایش مراحل و وضعیت‌های گردش کار پیش‌فرض</p>
                </div>
            </div>

            {/* Success/Error Messages */}
            {saveSuccess && (
                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    <span>تغییرات با موفقیت ذخیره شد</span>
                </div>
            )}

            {saveError && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    <span>{saveError}</span>
                </div>
            )}

            {/* Template Info */}
            <div className="card-modern">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                        <GitBranch className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-text-primary">{template.name_fa}</h2>
                        <p className="text-sm text-text-secondary">کد: {template.code}</p>
                    </div>
                </div>
                {template.description && (
                    <p className="text-sm text-text-secondary">{template.description}</p>
                )}
            </div>

            {/* States List */}
            <div className="card-modern">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-text-primary">مراحل گردش کار</h3>
                    <span className="text-sm text-text-secondary">{states.length} مرحله</span>
                </div>

                <div className="space-y-4">
                    {states.map((state, index) => (
                        <div key={state.id} className="relative">
                            {/* State Card */}
                            <div className={`border-2 rounded-xl p-4 transition-all ${
                                editingState === state.id
                                    ? 'border-primary-300 bg-primary-50'
                                    : 'border-gray-200 hover:border-primary-200'
                            }`}>
                                <div className="flex items-start gap-4">
                                    {/* Order Number */}
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-text-primary">
                                        {state.order}
                                    </div>

                                    {/* State Content */}
                                    <div className="flex-1">
                                        {editingState === state.id ? (
                                            // Edit Mode
                                            <div className="space-y-3">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                                            نام انگلیسی
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editForm.name}
                                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                            className="input-modern text-sm"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-text-primary mb-1">
                                                            نام فارسی
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editForm.name_fa}
                                                            onChange={(e) => setEditForm({ ...editForm, name_fa: e.target.value })}
                                                            className="input-modern text-sm"
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-text-primary mb-1">
                                                        توضیحات
                                                    </label>
                                                    <textarea
                                                        value={editForm.description}
                                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                        className="input-modern text-sm resize-none"
                                                        rows={2}
                                                    />
                                                </div>

                                                <div className="flex items-center gap-2 pt-2">
                                                    <button
                                                        onClick={() => handleSaveState(state.id)}
                                                        disabled={saving}
                                                        className="btn-primary !py-1 !px-3 text-sm flex items-center gap-1"
                                                    >
                                                        {saving ? (
                                                            <Loader className="w-3 h-3 animate-spin" />
                                                        ) : (
                                                            <Save className="w-3 h-3" />
                                                        )}
                                                        ذخیره
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        className="btn-ghost !py-1 !px-3 text-sm flex items-center gap-1"
                                                    >
                                                        <X className="w-3 h-3" />
                                                        انصراف
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // View Mode
                                            <div>
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-semibold text-text-primary">{state.name_fa}</h4>
                                                    <span className="text-xs text-text-tertiary">({state.code})</span>
                                                    <span className={`text-xs px-2 py-1 rounded-md border ${getStateTypeColor(state.state_type)}`}>
                                                        {getStateTypeLabel(state.state_type)}
                                                    </span>
                                                    {state.form_number && (
                                                        <span className="text-xs px-2 py-1 rounded-md bg-info-100 text-info-700 border border-info-200">
                                                            فرم {state.form_number}
                                                        </span>
                                                    )}
                                                </div>
                                                {state.description && (
                                                    <p className="text-sm text-text-secondary mb-2">{state.description}</p>
                                                )}
                                                <div className="flex items-center gap-2 text-xs text-text-tertiary">
                                                    <span>نام انگلیسی: {state.name}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {editingState !== state.id && (
                                        <button
                                            onClick={() => handleEditState(state)}
                                            className="flex-shrink-0 p-2 hover:bg-primary-100 rounded-lg transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4 text-primary-600" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Arrow to next state */}
                            {index < states.length - 1 && (
                                <div className="flex justify-center my-2">
                                    <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
