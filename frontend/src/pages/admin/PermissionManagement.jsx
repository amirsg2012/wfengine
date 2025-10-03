// src/pages/admin/PermissionManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    Key, Shield, FileText, Users, Eye, Edit, Trash2, Plus,
    CheckCircle, XCircle, RefreshCw, AlertCircle, Lock, Unlock, X, Save,
    ChevronDown, ChevronRight, Layers
} from 'lucide-react';
import api from '../../api/client';

const STATE_ORDER = [
    "ApplicantRequest",
    "CEOInstruction",
    "Form1",
    "Form2",
    "DocsCollection",
    "Form3",
    "Form4",
    "AMLForm",
    "EvaluationCommittee",
    "AppraisalFeeDeposit",
    "AppraisalNotice",
    "AppraisalOpinion",
    "AppraisalDecision",
    "Settlment",
];

const STATE_LABELS_FA = {
    "ApplicantRequest": "درخواست متقاضی",
    "CEOInstruction": "دستور مدیرعامل",
    "Form1": "فرم ۱ - اطلاعات متقاضی",
    "Form2": "فرم ۲ - مشخصات ملک",
    "DocsCollection": "جمع‌آوری مدارک",
    "Form3": "فرم ۳ - بررسی وضعیت ملک",
    "Form4": "فرم ۴ - ارزیابی",
    "AMLForm": "فرم AML",
    "EvaluationCommittee": "کمیته ارزیابی",
    "AppraisalFeeDeposit": "واریز کارمزد ارزیابی",
    "AppraisalNotice": "اعلام ارزیابی",
    "AppraisalOpinion": "نظر ارزیاب",
    "AppraisalDecision": "تصمیم ارزیابی",
    "Settlment": "تسویه",
};

const PermissionBadge = ({ type }) => {
    const getBadgeStyle = () => {
        switch (type) {
            case 'VIEW':
                return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'EDIT':
                return 'bg-warning-100 text-warning-700 border-warning-200';
            case 'APPROVE':
                return 'bg-success-100 text-success-700 border-success-200';
            case 'DELETE':
                return 'bg-error-100 text-error-700 border-error-200';
            case 'TRANSITION':
                return 'bg-purple-100 text-purple-700 border-purple-200';
            default:
                return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getLabel = () => {
        switch (type) {
            case 'VIEW': return 'مشاهده';
            case 'EDIT': return 'ویرایش';
            case 'APPROVE': return 'تأیید';
            case 'DELETE': return 'حذف';
            case 'TRANSITION': return 'انتقال';
            default: return type;
        }
    };

    return (
        <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getBadgeStyle()}`}>
            {getLabel()}
        </span>
    );
};

const PermissionCard = ({ permission, type, onToggle, onEdit }) => {
    const renderContent = () => {
        if (type === 'state') {
            return (
                <>
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-primary-500" />
                        <span className="font-bold text-text-primary">
                            {STATE_LABELS_FA[permission.state] || permission.state}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <PermissionBadge type={permission.permission_type} />
                        {permission.restrict_to_own && (
                            <span className="px-2 py-1 rounded text-xs bg-warning-100 text-warning-700 border border-warning-200">
                                فقط خود
                            </span>
                        )}
                    </div>
                    <p className="text-sm text-text-secondary">
                        {permission.role ? `نقش: ${permission.role}` : `کاربر: ${permission.user}`}
                    </p>
                </>
            );
        } else if (type === 'step') {
            return (
                <>
                    <div className="flex items-center gap-2 mb-2">
                        <Layers className="w-5 h-5 text-purple-500" />
                        <span className="font-bold text-text-primary">
                            {STATE_LABELS_FA[permission.state] || permission.state}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg text-xs font-bold border bg-purple-100 text-purple-700 border-purple-200">
                            گام {permission.step + 1}
                        </span>
                    </div>
                    <p className="text-sm text-text-secondary">
                        {permission.role ? `نقش: ${permission.role}` : `کاربر: ${permission.user}`}
                    </p>
                </>
            );
        } else if (type === 'form') {
            return (
                <>
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-5 h-5 text-warning-500" />
                        <span className="font-bold text-text-primary">فرم شماره {permission.form_number}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <PermissionBadge type={permission.permission_type} />
                    </div>
                    <p className="text-sm text-text-secondary">
                        {permission.role ? `نقش: ${permission.role}` : `کاربر: ${permission.user}`}
                    </p>
                </>
            );
        }
    };

    return (
        <div className={`card-modern p-4 transition-all ${
            permission.is_active ? 'border-success-200 bg-white' : 'border-primary-100 bg-surface-secondary opacity-60'
        }`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {renderContent()}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => onEdit(permission)}
                        className="p-2 rounded-lg transition-colors bg-primary-50 text-primary-600 hover:bg-primary-100 border border-primary-200"
                        title="ویرایش"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => onToggle(permission.id, !permission.is_active, type)}
                        className={`p-2 rounded-lg transition-colors border ${
                            permission.is_active
                                ? 'bg-success-50 text-success-600 hover:bg-success-100 border-success-200'
                                : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 border-primary-200'
                        }`}
                        title={permission.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                    >
                        {permission.is_active ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

const StateGroup = ({ state, permissions, onToggle, onEdit, expanded, onToggleExpand }) => {
    const statePerms = permissions.filter(p => p.state === state);

    if (statePerms.length === 0) return null;

    return (
        <div className="card-modern mb-4">
            <button
                onClick={onToggleExpand}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-secondary transition-colors"
            >
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="w-5 h-5 text-primary-600" /> : <ChevronRight className="w-5 h-5 text-primary-600" />}
                    <Shield className="w-6 h-6 text-primary-500" />
                    <div className="text-right">
                        <h3 className="font-bold text-text-primary text-lg">
                            {STATE_LABELS_FA[state] || state}
                        </h3>
                        <p className="text-sm text-text-secondary">
                            {statePerms.length} دسترسی
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {statePerms.filter(p => p.is_active).length > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-700">
                            {statePerms.filter(p => p.is_active).length} فعال
                        </span>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="p-4 border-t border-primary-200 bg-surface-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {statePerms.map(perm => (
                            <PermissionCard
                                key={perm.id}
                                permission={perm}
                                type="state"
                                onToggle={onToggle}
                                onEdit={(perm) => onEdit(perm, 'state')}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const StepGroup = ({ state, permissions, onToggle, onEdit, expanded, onToggleExpand }) => {
    const stepPerms = permissions.filter(p => p.state === state);

    if (stepPerms.length === 0) return null;

    // Group by step
    const stepGroups = {};
    stepPerms.forEach(p => {
        if (!stepGroups[p.step]) {
            stepGroups[p.step] = [];
        }
        stepGroups[p.step].push(p);
    });

    return (
        <div className="card-modern mb-4">
            <button
                onClick={onToggleExpand}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-secondary transition-colors"
            >
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="w-5 h-5 text-purple-600" /> : <ChevronRight className="w-5 h-5 text-purple-600" />}
                    <Layers className="w-6 h-6 text-purple-500" />
                    <div className="text-right">
                        <h3 className="font-bold text-text-primary text-lg">
                            {STATE_LABELS_FA[state] || state}
                        </h3>
                        <p className="text-sm text-text-secondary">
                            {Object.keys(stepGroups).length} گام - {stepPerms.length} دسترسی
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {stepPerms.filter(p => p.is_active).length > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-700">
                            {stepPerms.filter(p => p.is_active).length} فعال
                        </span>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="p-4 border-t border-primary-200 bg-surface-secondary">
                    {Object.keys(stepGroups).sort((a, b) => parseInt(a) - parseInt(b)).map(step => (
                        <div key={step} className="mb-4">
                            <h4 className="font-bold text-purple-700 mb-3 flex items-center gap-2">
                                <span className="px-2 py-1 bg-purple-100 rounded text-sm">گام {parseInt(step) + 1}</span>
                                <span className="text-sm text-text-secondary">({stepGroups[step].length} دسترسی)</span>
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {stepGroups[step].map(perm => (
                                    <PermissionCard
                                        key={perm.id}
                                        permission={perm}
                                        type="step"
                                        onToggle={onToggle}
                                        onEdit={(perm) => onEdit(perm, 'step')}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const FormGroup = ({ formNumber, permissions, onToggle, onEdit, expanded, onToggleExpand }) => {
    const formPerms = permissions.filter(p => p.form_number === formNumber);

    if (formPerms.length === 0) return null;

    return (
        <div className="card-modern mb-4">
            <button
                onClick={onToggleExpand}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-secondary transition-colors"
            >
                <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown className="w-5 h-5 text-warning-600" /> : <ChevronRight className="w-5 h-5 text-warning-600" />}
                    <FileText className="w-6 h-6 text-warning-500" />
                    <div className="text-right">
                        <h3 className="font-bold text-text-primary text-lg">
                            فرم شماره {formNumber}
                        </h3>
                        <p className="text-sm text-text-secondary">
                            {formPerms.length} دسترسی
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {formPerms.filter(p => p.is_active).length > 0 && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-success-100 text-success-700">
                            {formPerms.filter(p => p.is_active).length} فعال
                        </span>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="p-4 border-t border-primary-200 bg-surface-secondary">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {formPerms.map(perm => (
                            <PermissionCard
                                key={perm.id}
                                permission={perm}
                                type="form"
                                onToggle={onToggle}
                                onEdit={(perm) => onEdit(perm, 'form')}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PermissionEditModal = ({ permission, type, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        permission_type: permission?.permission_type || 'VIEW',
        is_active: permission?.is_active ?? true,
        restrict_to_own: permission?.restrict_to_own ?? false,
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onSave(permission.id, formData);
        } finally {
            setLoading(false);
        }
    };

    const permissionTypes = [
        { value: 'VIEW', label: 'مشاهده', icon: Eye },
        { value: 'EDIT', label: 'ویرایش', icon: Edit },
        { value: 'APPROVE', label: 'تأیید', icon: CheckCircle },
        { value: 'DELETE', label: 'حذف', icon: Trash2 },
        { value: 'TRANSITION', label: 'انتقال', icon: RefreshCw }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-surface dark:bg-surface-dark rounded-2xl shadow-3d-xl border-2 border-primary-200 max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-primary-200 bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center shadow-md">
                            <Key className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-text-primary">
                            ویرایش دسترسی
                        </h3>
                    </div>
                    <button onClick={onClose} className="btn-ghost !p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Permission Info */}
                    <div className="card-modern p-5 bg-gradient-to-br from-primary-50 to-primary-100/50 border-2 border-primary-200">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md">
                                {type === 'state' ? (
                                    <Shield className="w-6 h-6 text-white" />
                                ) : type === 'step' ? (
                                    <Layers className="w-6 h-6 text-white" />
                                ) : (
                                    <FileText className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">
                                    {type === 'state' ? 'دسترسی حالت' : type === 'step' ? 'دسترسی گام' : 'دسترسی فرم'}
                                </p>
                                <p className="text-lg font-bold text-text-primary mb-2">
                                    {type === 'state' ? (STATE_LABELS_FA[permission.state] || permission.state) :
                                     type === 'step' ? `${STATE_LABELS_FA[permission.state] || permission.state} - گام ${permission.step + 1}` :
                                     `فرم شماره ${permission.form_number}`}
                                </p>
                                <div className="flex items-center gap-2 text-sm">
                                    <Users className="w-4 h-4 text-text-secondary" />
                                    <span className="text-text-secondary">
                                        {permission.role ? `نقش: ${permission.role}` : `کاربر: ${permission.user}`}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Permission Type - only for non-step permissions */}
                    {type !== 'step' && (
                        <div>
                            <label className="block text-sm font-bold text-text-primary mb-3">
                                انتخاب نوع دسترسی
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {permissionTypes.map(({ value, label, icon: Icon }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, permission_type: value }))}
                                        className={`group relative px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                                            formData.permission_type === value
                                                ? 'bg-primary-500 text-white shadow-3d-lg scale-105'
                                                : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-text-primary border border-primary-100 hover:border-primary-300 hover:scale-102'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 justify-center">
                                            <Icon className={`w-4 h-4 ${
                                                formData.permission_type === value ? 'text-white' : 'text-primary-500'
                                            }`} />
                                            <span>{label}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Restrict to Own - only for state permissions */}
                    {type === 'state' && (
                        <div className="card-modern p-4 bg-surface-secondary border border-primary-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input
                                        type="checkbox"
                                        checked={formData.restrict_to_own}
                                        onChange={(e) => setFormData(prev => ({ ...prev, restrict_to_own: e.target.checked }))}
                                        className="w-5 h-5 text-primary-600 rounded border-primary-300 cursor-pointer focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <span className="text-sm font-bold text-text-primary block">محدود به خود</span>
                                    <span className="text-xs text-text-secondary">کاربر فقط می‌تواند گردش‌کارهای خود را مشاهده کند</span>
                                </div>
                            </label>
                        </div>
                    )}

                    {/* Active Status */}
                    <div className="card-modern p-4 bg-surface-secondary border border-primary-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                    className="w-5 h-5 text-primary-600 rounded border-primary-300 cursor-pointer focus:ring-2 focus:ring-primary-500"
                                />
                            </div>
                            <div className="flex-1">
                                <span className="text-sm font-bold text-text-primary block">دسترسی فعال</span>
                                <span className="text-xs text-text-secondary">این دسترسی در سیستم فعال باشد</span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                                formData.is_active
                                    ? 'bg-success-100 text-success-700'
                                    : 'bg-error-100 text-error-700'
                            }`}>
                                {formData.is_active ? 'فعال' : 'غیرفعال'}
                            </div>
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-primary-200">
                        <button type="button" onClick={onClose} className="btn-ghost">
                            انصراف
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>در حال ذخیره...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>ذخیره تغییرات</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function PermissionManagement() {
    const [permissions, setPermissions] = useState({
        state_permissions: [],
        step_permissions: [],
        form_permissions: []
    });
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('state');
    const [searchQuery, setSearchQuery] = useState('');
    const [message, setMessage] = useState(null);
    const [editingPermission, setEditingPermission] = useState(null);
    const [editingType, setEditingType] = useState(null);
    const [expandedGroups, setExpandedGroups] = useState({});

    useEffect(() => {
        loadPermissions();
        loadSummary();
    }, []);

    const loadPermissions = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/permissions/', {
                params: { type: 'all' }
            });
            setPermissions(response.data);
        } catch (error) {
            console.error('Error loading permissions:', error);
            setMessage({ type: 'error', text: 'خطا در بارگذاری دسترسی‌ها' });
        } finally {
            setLoading(false);
        }
    };

    const loadSummary = async () => {
        try {
            const response = await api.get('/admin/permissions/summary/');
            setSummary(response.data);
        } catch (error) {
            console.error('Error loading summary:', error);
        }
    };

    const handleTogglePermission = async (permissionId, isActive, type) => {
        try {
            await api.patch(`/admin/permissions/${permissionId}/toggle/`, {
                type: type
            });

            setMessage({
                type: 'success',
                text: 'وضعیت دسترسی با موفقیت تغییر کرد'
            });

            await loadPermissions();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error toggling permission:', error);
            setMessage({
                type: 'error',
                text: 'خطا در تغییر وضعیت دسترسی'
            });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const handleEditPermission = (permission, type) => {
        setEditingPermission(permission);
        setEditingType(type);
    };

    const handleSavePermission = async (permissionId, formData) => {
        try {
            await api.put(`/admin/permissions/${permissionId}/update_permission/`, {
                ...formData,
                type: editingType
            });

            setMessage({
                type: 'success',
                text: 'دسترسی با موفقیت بروزرسانی شد'
            });

            setEditingPermission(null);
            setEditingType(null);
            await loadPermissions();
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error updating permission:', error);
            setMessage({
                type: 'error',
                text: 'خطا در بروزرسانی دسترسی'
            });
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const toggleGroup = (groupKey) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey]
        }));
    };

    const expandAll = () => {
        const newExpanded = {};
        if (activeTab === 'state') {
            STATE_ORDER.forEach(state => {
                newExpanded[state] = true;
            });
        } else if (activeTab === 'step') {
            STATE_ORDER.forEach(state => {
                newExpanded[state] = true;
            });
        } else if (activeTab === 'form') {
            [1, 2, 3, 4].forEach(num => {
                newExpanded[num] = true;
            });
        }
        setExpandedGroups(newExpanded);
    };

    const collapseAll = () => {
        setExpandedGroups({});
    };

    const filterPermissions = (perms) => {
        if (!searchQuery) return perms;

        return perms.filter(p =>
            (p.state && (p.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        STATE_LABELS_FA[p.state]?.includes(searchQuery))) ||
            (p.role && p.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.user && p.user.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.form_number && p.form_number.toString().includes(searchQuery))
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg mx-auto mb-4">
                        <RefreshCw className="w-8 h-8 animate-spin text-white" />
                    </div>
                    <p className="text-text-secondary">در حال بارگذاری دسترسی‌ها...</p>
                </div>
            </div>
        );
    }

    const statePermissions = filterPermissions(permissions.state_permissions || []);
    const stepPermissions = filterPermissions(permissions.step_permissions || []);
    const formPermissions = filterPermissions(permissions.form_permissions || []);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg">
                        <Key className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">مدیریت دسترسی‌ها</h1>
                        <p className="text-text-secondary mt-1">نظارت و کنترل دسترسی‌های سیستم با گروه‌بندی پیشرفته</p>
                    </div>
                </div>

                <button
                    onClick={loadPermissions}
                    className="btn-ghost flex items-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    بروزرسانی
                </button>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    message.type === 'error'
                        ? 'bg-error-50 border-error-200 text-error-700'
                        : 'bg-blue-50 border-blue-200 text-blue-700'
                }`}>
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="card-modern p-4 text-center">
                        <Shield className="w-8 h-8 text-primary-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{summary.state_permissions}</p>
                        <p className="text-sm text-text-secondary">دسترسی حالت</p>
                    </div>

                    <div className="card-modern p-4 text-center">
                        <Layers className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{summary.state_step_permissions}</p>
                        <p className="text-sm text-text-secondary">دسترسی گام</p>
                    </div>

                    <div className="card-modern p-4 text-center">
                        <FileText className="w-8 h-8 text-warning-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{summary.form_permissions}</p>
                        <p className="text-sm text-text-secondary">دسترسی فرم</p>
                    </div>

                    <div className="card-modern p-4 text-center">
                        <Key className="w-8 h-8 text-success-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{summary.total_roles}</p>
                        <p className="text-sm text-text-secondary">نقش‌ها</p>
                    </div>

                    <div className="card-modern p-4 text-center">
                        <Users className="w-8 h-8 text-error-500 mx-auto mb-2" />
                        <p className="text-2xl font-bold text-text-primary">{summary.total_users}</p>
                        <p className="text-sm text-text-secondary">کاربران</p>
                    </div>
                </div>
            )}

            {/* Search & Controls */}
            <div className="card-modern p-4 flex flex-col md:flex-row gap-4 items-center">
                <input
                    type="text"
                    placeholder="جستجو در دسترسی‌ها (حالت، نقش، کاربر)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-modern flex-1"
                />
                <div className="flex gap-2">
                    <button onClick={expandAll} className="btn-ghost text-sm">
                        باز کردن همه
                    </button>
                    <button onClick={collapseAll} className="btn-ghost text-sm">
                        بستن همه
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-2 flex-wrap">
                <button
                    onClick={() => setActiveTab('state')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        activeTab === 'state'
                            ? 'bg-primary-500 text-white shadow-3d-lg'
                            : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-text-primary border border-primary-100'
                    }`}
                >
                    <Shield className="w-4 h-4 inline-block ml-2" />
                    دسترسی‌های حالت ({statePermissions.length})
                </button>

                <button
                    onClick={() => setActiveTab('step')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        activeTab === 'step'
                            ? 'bg-purple-500 text-white shadow-3d-lg'
                            : 'bg-surface-secondary text-text-secondary hover:bg-purple-50 hover:text-text-primary border border-purple-100'
                    }`}
                >
                    <Layers className="w-4 h-4 inline-block ml-2" />
                    دسترسی‌های گام ({stepPermissions.length})
                </button>

                <button
                    onClick={() => setActiveTab('form')}
                    className={`px-6 py-3 rounded-xl font-bold transition-all ${
                        activeTab === 'form'
                            ? 'bg-warning-500 text-white shadow-3d-lg'
                            : 'bg-surface-secondary text-text-secondary hover:bg-warning-50 hover:text-text-primary border border-warning-100'
                    }`}
                >
                    <FileText className="w-4 h-4 inline-block ml-2" />
                    دسترسی‌های فرم ({formPermissions.length})
                </button>
            </div>

            {/* Grouped Permissions */}
            <div className="space-y-4">
                {activeTab === 'state' && (
                    <>
                        {STATE_ORDER.map(state => (
                            <StateGroup
                                key={state}
                                state={state}
                                permissions={statePermissions}
                                onToggle={handleTogglePermission}
                                onEdit={handleEditPermission}
                                expanded={expandedGroups[state]}
                                onToggleExpand={() => toggleGroup(state)}
                            />
                        ))}
                    </>
                )}

                {activeTab === 'step' && (
                    <>
                        {STATE_ORDER.map(state => (
                            <StepGroup
                                key={state}
                                state={state}
                                permissions={stepPermissions}
                                onToggle={handleTogglePermission}
                                onEdit={handleEditPermission}
                                expanded={expandedGroups[state]}
                                onToggleExpand={() => toggleGroup(state)}
                            />
                        ))}
                    </>
                )}

                {activeTab === 'form' && (
                    <>
                        {[1, 2, 3, 4].map(formNumber => (
                            <FormGroup
                                key={formNumber}
                                formNumber={formNumber}
                                permissions={formPermissions}
                                onToggle={handleTogglePermission}
                                onEdit={handleEditPermission}
                                expanded={expandedGroups[formNumber]}
                                onToggleExpand={() => toggleGroup(formNumber)}
                            />
                        ))}
                    </>
                )}

                {((activeTab === 'state' && statePermissions.length === 0) ||
                  (activeTab === 'step' && stepPermissions.length === 0) ||
                  (activeTab === 'form' && formPermissions.length === 0)) && (
                    <div className="text-center py-12 text-text-secondary">
                        <Key className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>دسترسی یافت نشد</p>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="card-modern p-6 bg-primary-50 border-2 border-primary-200">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-primary-600 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-primary-800 mb-2">نکات مهم</h3>
                        <ul className="text-sm text-primary-700 space-y-1 mr-4">
                            <li>• دسترسی‌ها بر اساس حالت، گام و فرم گروه‌بندی شده‌اند</li>
                            <li>• دسترسی‌های حالت کنترل می‌کنند که چه کسی می‌تواند گردش‌کارها را مشاهده/ویرایش/حذف کند</li>
                            <li>• دسترسی‌های گام کنترل می‌کنند که چه کسی می‌تواند هر گام از تأیید را انجام دهد</li>
                            <li>• دسترسی‌های فرم کنترل می‌کنند که چه کسی می‌تواند فرم‌های خاص را مشاهده/ویرایش کند</li>
                            <li>• برای اعمال تغییرات دسترسی، ممکن است نیاز به خروج و ورود مجدد کاربران باشد</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {editingPermission && (
                <PermissionEditModal
                    permission={editingPermission}
                    type={editingType}
                    onSave={handleSavePermission}
                    onClose={() => {
                        setEditingPermission(null);
                        setEditingType(null);
                    }}
                />
            )}
        </div>
    );
}
