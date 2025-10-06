// src/pages/admin/SimplifiedPermissionManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    Shield, Users, ChevronDown, ChevronRight, Plus, X, Save,
    Clock, AlertCircle, CheckCircle, Trash2, UserPlus
} from 'lucide-react';
import api from '../../api/client';

const SimplifiedPermissionManagement = () => {
    const [states, setStates] = useState([]);
    const [expandedStates, setExpandedStates] = useState({});
    const [availableRoles, setAvailableRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showOverrideModal, setShowOverrideModal] = useState(false);
    const [selectedStep, setSelectedStep] = useState(null);
    const [overrides, setOverrides] = useState([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [statesRes, rolesRes, overridesRes] = await Promise.all([
                api.get('/admin/workflow-states/'),
                api.get('/admin/available-roles/'),
                api.get('/admin/step-overrides/')
            ]);

            setStates(statesRes.data);
            setAvailableRoles(rolesRes.data);
            setOverrides(overridesRes.data);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleState = (stateId) => {
        setExpandedStates(prev => ({
            ...prev,
            [stateId]: !prev[stateId]
        }));
    };

    const addRoleToStep = async (stepId, roleCode) => {
        try {
            await api.post(`/admin/workflow-steps/${stepId}/add_role/`, {
                role_code: roleCode
            });
            await loadData();
        } catch (error) {
            console.error('Failed to add role:', error);
            alert('خطا در افزودن نقش');
        }
    };

    const removeRoleFromStep = async (stepId, roleCode) => {
        if (!confirm('آیا مطمئن هستید؟')) return;

        try {
            await api.post(`/admin/workflow-steps/${stepId}/remove_role/`, {
                role_code: roleCode
            });
            await loadData();
        } catch (error) {
            console.error('Failed to remove role:', error);
            alert('خطا در حذف نقش');
        }
    };

    const openOverrideModal = (step) => {
        setSelectedStep(step);
        setShowOverrideModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-text-secondary">در حال بارگذاری...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="card-modern p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-2">
                            مدیریت دسترسی‌های ساده‌شده
                        </h1>
                        <p className="text-text-secondary">
                            مدیریت دسترسی‌های مبتنی بر گام‌های گردش کار
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-primary-600">
                                {states.length}
                            </div>
                            <div className="text-sm text-text-secondary">وضعیت</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-success-600">
                                {states.reduce((sum, s) => sum + s.steps.length, 0)}
                            </div>
                            <div className="text-sm text-text-secondary">گام</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-warning-600">
                                {overrides.filter(o => o.is_valid).length}
                            </div>
                            <div className="text-sm text-text-secondary">دسترسی موقت</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Overrides */}
            {overrides.filter(o => o.is_valid).length > 0 && (
                <div className="card-modern p-6">
                    <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-warning-500" />
                        دسترسی‌های موقت فعال
                    </h2>
                    <div className="space-y-2">
                        {overrides.filter(o => o.is_valid).map(override => (
                            <OverrideCard
                                key={override.id}
                                override={override}
                                onRevoke={async () => {
                                    await api.post(`/admin/step-overrides/${override.id}/revoke/`);
                                    loadData();
                                }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Workflow States */}
            <div className="space-y-4">
                {states.map(state => (
                    <StateCard
                        key={state.id}
                        state={state}
                        expanded={expandedStates[state.id]}
                        onToggle={() => toggleState(state.id)}
                        availableRoles={availableRoles}
                        onAddRole={addRoleToStep}
                        onRemoveRole={removeRoleFromStep}
                        onOpenOverride={openOverrideModal}
                    />
                ))}
            </div>

            {/* Override Modal */}
            {showOverrideModal && (
                <OverrideModal
                    step={selectedStep}
                    onClose={() => setShowOverrideModal(false)}
                    onSuccess={() => {
                        setShowOverrideModal(false);
                        loadData();
                    }}
                />
            )}
        </div>
    );
};

const StateCard = ({ state, expanded, onToggle, availableRoles, onAddRole, onRemoveRole, onOpenOverride }) => {
    const steps = state.steps || [];

    return (
        <div className="card-modern">
            <button
                onClick={onToggle}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-secondary transition-colors"
            >
                <div className="flex items-center gap-3">
                    {expanded ? (
                        <ChevronDown className="w-5 h-5 text-primary-600" />
                    ) : (
                        <ChevronRight className="w-5 h-5 text-primary-600" />
                    )}
                    <Shield className="w-6 h-6 text-primary-500" />
                    <div className="text-right">
                        <h3 className="font-bold text-text-primary text-lg">
                            {state.name_fa}
                        </h3>
                        <p className="text-sm text-text-secondary">
                            {steps.length} گام
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-primary-100 text-primary-700">
                        {state.code}
                    </span>
                </div>
            </button>

            {expanded && steps.length > 0 && (
                <div className="border-t border-primary-100 p-4 space-y-4 bg-surface-secondary">
                    {steps.map((step, index) => (
                        <StepCard
                            key={step.id}
                            step={step}
                            stateName={state.name_fa}
                            availableRoles={availableRoles}
                            onAddRole={onAddRole}
                            onRemoveRole={onRemoveRole}
                            onOpenOverride={onOpenOverride}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const StepCard = ({ step, stateName, availableRoles, onAddRole, onRemoveRole, onOpenOverride }) => {
    const [showAddRole, setShowAddRole] = useState(false);
    const [selectedRole, setSelectedRole] = useState('');

    // Safe defaults
    const roles = step.roles || [];
    const users = step.users || [];

    const handleAddRole = () => {
        if (selectedRole) {
            onAddRole(step.id, selectedRole);
            setSelectedRole('');
            setShowAddRole(false);
        }
    };

    const getActionTypeBadge = (actionType) => {
        const colors = {
            'FILL': 'bg-blue-100 text-blue-700',
            'APPROVE': 'bg-success-100 text-success-700',
            'SIGN': 'bg-warning-100 text-warning-700',
            'REVIEW': 'bg-purple-100 text-purple-700',
        };
        return colors[actionType] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="card-modern p-4">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-3 py-1 rounded-lg text-sm font-bold bg-purple-100 text-purple-700">
                            گام {(step.step_number || 0) + 1}
                        </span>
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getActionTypeBadge(step.action_type)}`}>
                            {step.action_type || 'APPROVE'}
                        </span>
                        {step.requires_all_approvers && (
                            <span className="px-2 py-1 rounded text-xs bg-warning-100 text-warning-700">
                                نیاز به تایید همه
                            </span>
                        )}
                    </div>
                    <h4 className="font-bold text-text-primary">{step.name_fa}</h4>
                    {step.description_fa && (
                        <p className="text-sm text-text-secondary mt-1">{step.description_fa}</p>
                    )}
                </div>
                <button
                    onClick={() => onOpenOverride(step)}
                    className="btn-secondary-small flex items-center gap-1"
                    title="افزودن دسترسی موقت"
                >
                    <UserPlus className="w-4 h-4" />
                    دسترسی موقت
                </button>
            </div>

            {/* Roles */}
            <div className="mb-3">
                <div className="text-sm font-bold text-text-secondary mb-2">نقش‌های مجاز:</div>
                <div className="flex flex-wrap gap-2">
                    {roles.map(role => (
                        <div key={role.id} className="flex items-center gap-2 px-3 py-1 rounded-lg bg-primary-50 border border-primary-200">
                            <Users className="w-4 h-4 text-primary-600" />
                            <span className="text-sm font-bold text-primary-700">{role.name_fa}</span>
                            <span className="text-xs text-primary-600">({role.code})</span>
                            <button
                                onClick={() => onRemoveRole(step.id, role.code)}
                                className="text-error-500 hover:text-error-700"
                                title="حذف"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {roles.length === 0 && (
                        <span className="text-sm text-text-secondary">هیچ نقشی تعریف نشده</span>
                    )}
                </div>
            </div>

            {/* Add Role */}
            {showAddRole ? (
                <div className="flex items-center gap-2 mt-3">
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className="input-modern flex-1"
                    >
                        <option value="">انتخاب نقش...</option>
                        {availableRoles
                            .filter(r => !roles.some(sr => sr.code === r.code))
                            .map(role => (
                                <option key={role.id} value={role.code}>
                                    {role.name_fa} ({role.code})
                                </option>
                            ))
                        }
                    </select>
                    <button onClick={handleAddRole} className="btn-primary-small">
                        <Save className="w-4 h-4" />
                    </button>
                    <button onClick={() => setShowAddRole(false)} className="btn-secondary-small">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddRole(true)}
                    className="btn-secondary-small flex items-center gap-1 mt-3"
                >
                    <Plus className="w-4 h-4" />
                    افزودن نقش
                </button>
            )}
        </div>
    );
};

const OverrideCard = ({ override, onRevoke }) => {
    const getTimeRemaining = (expiresAt) => {
        const now = new Date();
        const expires = new Date(expiresAt);
        const diffMs = expires - now;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        return diffHours > 0 ? `${diffHours} ساعت` : 'منقضی شده';
    };

    return (
        <div className="flex items-center justify-between p-3 rounded-lg bg-warning-50 border border-warning-200">
            <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-warning-600" />
                <div>
                    <div className="font-bold text-text-primary">
                        {override.user.username}
                    </div>
                    <div className="text-sm text-text-secondary">
                        {override.step ? `${override.step.state_name_fa} - گام ${override.step.step_number + 1}` : 'همه گام‌ها'}
                    </div>
                    {override.reason && (
                        <div className="text-xs text-text-secondary mt-1">دلیل: {override.reason}</div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-sm text-text-secondary">
                    <Clock className="w-4 h-4 inline ml-1" />
                    {getTimeRemaining(override.expires_at)}
                </div>
                <button
                    onClick={onRevoke}
                    className="btn-error-small"
                    title="لغو دسترسی"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

const OverrideModal = ({ step, onClose, onSuccess }) => {
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState('');
    const [durationHours, setDurationHours] = useState(24);
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        try {
            const response = await api.get('/admin/users/');
            setUsers(response.data);
        } catch (error) {
            console.error('Failed to load users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedUser) {
            alert('لطفا کاربر را انتخاب کنید');
            return;
        }

        try {
            await api.post('/admin/step-overrides/create_override/', {
                workflow_id: null, // Will be set when used in workflow detail
                user_id: selectedUser,
                step_id: step.id,
                duration_hours: durationHours,
                reason: reason
            });

            onSuccess();
        } catch (error) {
            console.error('Failed to create override:', error);
            alert('خطا در ایجاد دسترسی موقت');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-modern p-6 max-w-lg w-full mx-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-text-primary">
                        ایجاد دسترسی موقت
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-200">
                    <div className="text-sm text-text-secondary">گام:</div>
                    <div className="font-bold text-text-primary">{step.name_fa}</div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">
                            کاربر
                        </label>
                        <select
                            value={selectedUser}
                            onChange={(e) => setSelectedUser(e.target.value)}
                            className="input-modern w-full"
                            required
                        >
                            <option value="">انتخاب کاربر...</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>
                                    {user.username} - {user.first_name} {user.last_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">
                            مدت زمان (ساعت)
                        </label>
                        <input
                            type="number"
                            value={durationHours}
                            onChange={(e) => setDurationHours(parseInt(e.target.value))}
                            className="input-modern w-full"
                            min="1"
                            max="720"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-text-primary mb-2">
                            دلیل
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="input-modern w-full"
                            rows="3"
                            placeholder="دلیل ایجاد دسترسی موقت..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="submit" className="btn-primary flex-1">
                            <CheckCircle className="w-5 h-5 ml-2" />
                            ایجاد دسترسی
                        </button>
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            انصراف
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SimplifiedPermissionManagement;
