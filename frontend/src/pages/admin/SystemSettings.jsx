// src/pages/admin/SystemSettings.jsx
import React, { useState, useEffect } from 'react';
import {
    Settings, Save, RefreshCw, Clock, Key, Database, Shield,
    AlertCircle, CheckCircle, Edit2, X
} from 'lucide-react';
import api from '../../api/client';

const SettingCard = ({ setting, onEdit, onSave, isEditing, editValue, onEditChange }) => {
    const getIcon = (category) => {
        switch (category) {
            case 'auth': return <Key className="w-5 h-5 text-primary-500" />;
            case 'storage': return <Database className="w-5 h-5 text-warning-500" />;
            case 'general': return <Settings className="w-5 h-5 text-success-500" />;
            default: return <Shield className="w-5 h-5 text-gray-500" />;
        }
    };

    const getValueType = (value_type) => {
        switch (value_type) {
            case 'integer': return 'عدد';
            case 'boolean': return 'بله/خیر';
            case 'float': return 'اعشاری';
            default: return 'متن';
        }
    };

    return (
        <div className="card-modern p-6 hover:shadow-3d-lg transition-all">
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0 border border-primary-200">
                        {getIcon(setting.category)}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-text-primary">{setting.key}</h4>
                            <span className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded border border-primary-200">
                                {getValueType(setting.value_type)}
                            </span>
                        </div>

                        <p className="text-sm text-text-secondary mb-3">{setting.description}</p>

                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                {setting.value_type === 'boolean' ? (
                                    <select
                                        value={editValue}
                                        onChange={(e) => onEditChange(e.target.value)}
                                        className="input-modern flex-1"
                                    >
                                        <option value="true">بله</option>
                                        <option value="false">خیر</option>
                                    </select>
                                ) : (
                                    <input
                                        type={setting.value_type === 'integer' || setting.value_type === 'float' ? 'number' : 'text'}
                                        value={editValue}
                                        onChange={(e) => onEditChange(e.target.value)}
                                        className="input-modern flex-1"
                                        step={setting.value_type === 'float' ? '0.01' : '1'}
                                    />
                                )}

                                <button
                                    onClick={onSave}
                                    className="btn-primary px-4 py-2"
                                >
                                    <Save className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => onEdit(null)}
                                    className="btn-ghost px-4 py-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg font-mono font-bold flex-1 border border-primary-200">
                                    {setting.value_type === 'boolean'
                                        ? (setting.value.toLowerCase() === 'true' ? 'بله' : 'خیر')
                                        : setting.value
                                    }
                                    {setting.key.includes('LIFETIME') && ' دقیقه'}
                                </div>

                                <button
                                    onClick={() => onEdit(setting.key)}
                                    className="btn-ghost px-4 py-2"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {setting.updated_at && (
                            <p className="text-xs text-text-secondary mt-2">
                                آخرین بروزرسانی: {new Date(setting.updated_at).toLocaleString('fa-IR')}
                                {setting.updated_by && ` توسط ${setting.updated_by}`}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function SystemSettings() {
    const [settings, setSettings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingKey, setEditingKey] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [message, setMessage] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/settings/');
            setSettings(response.data.settings || []);
        } catch (error) {
            console.error('Error loading settings:', error);
            setMessage({ type: 'error', text: 'خطا در بارگذاری تنظیمات' });
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (key) => {
        if (key === null) {
            setEditingKey(null);
            setEditValue('');
            return;
        }

        const setting = settings.find(s => s.key === key);
        if (setting) {
            setEditingKey(key);
            setEditValue(setting.value);
        }
    };

    const handleSave = async (key) => {
        try {
            setSaving(true);
            await api.put(`/admin/settings/${key}/`, {
                value: editValue
            });

            setMessage({ type: 'success', text: 'تنظیمات با موفقیت ذخیره شد' });
            setEditingKey(null);
            setEditValue('');
            await loadSettings();

            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error saving setting:', error);
            setMessage({ type: 'error', text: 'خطا در ذخیره تنظیمات' });
        } finally {
            setSaving(false);
        }
    };

    const handleInitializeDefaults = async () => {
        if (!confirm('آیا از ایجاد تنظیمات پیش‌فرض اطمینان دارید؟')) return;

        try {
            setSaving(true);
            await api.post('/admin/settings/initialize_defaults/');
            setMessage({ type: 'success', text: 'تنظیمات پیش‌فرض ایجاد شد' });
            await loadSettings();
        } catch (error) {
            console.error('Error initializing defaults:', error);
            setMessage({ type: 'error', text: 'خطا در ایجاد تنظیمات پیش‌فرض' });
        } finally {
            setSaving(false);
        }
    };

    const categories = [...new Set(settings.map(s => s.category))];
    const filteredSettings = selectedCategory === 'all'
        ? settings
        : settings.filter(s => s.category === selectedCategory);

    const getCategoryLabel = (cat) => {
        switch (cat) {
            case 'auth': return 'احراز هویت';
            case 'storage': return 'ذخیره‌سازی';
            case 'general': return 'عمومی';
            default: return cat;
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg mx-auto mb-4">
                        <RefreshCw className="w-8 h-8 animate-spin text-white" />
                    </div>
                    <p className="text-text-secondary">در حال بارگذاری تنظیمات...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg">
                        <Settings className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">تنظیمات سیستم</h1>
                        <p className="text-text-secondary mt-1">مدیریت پیکربندی‌های عمومی سیستم</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={loadSettings}
                        disabled={saving}
                        className="btn-ghost flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                        بروزرسانی
                    </button>

                    <button
                        onClick={handleInitializeDefaults}
                        disabled={saving}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <Database className="w-4 h-4" />
                        ایجاد پیش‌فرض‌ها
                    </button>
                </div>
            </div>

            {/* Message */}
            {message && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                    message.type === 'success'
                        ? 'bg-success-50 border-success-200 text-success-700'
                        : 'bg-error-50 border-error-200 text-error-700'
                }`}>
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <AlertCircle className="w-5 h-5" />
                    )}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Category Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                        selectedCategory === 'all'
                            ? 'bg-primary-500 text-white shadow-3d-lg'
                            : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-text-primary border border-primary-100'
                    }`}
                >
                    همه تنظیمات
                </button>

                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                            selectedCategory === cat
                                ? 'bg-primary-500 text-white shadow-3d-lg'
                                : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-text-primary border border-primary-100'
                        }`}
                    >
                        {getCategoryLabel(cat)}
                    </button>
                ))}
            </div>

            {/* Settings List */}
            <div className="space-y-4">
                {filteredSettings.length > 0 ? (
                    filteredSettings.map(setting => (
                        <SettingCard
                            key={setting.key}
                            setting={setting}
                            onEdit={handleEdit}
                            onSave={() => handleSave(setting.key)}
                            isEditing={editingKey === setting.key}
                            editValue={editValue}
                            onEditChange={setEditValue}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 text-text-secondary">
                        <Settings className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>هیچ تنظیماتی یافت نشد</p>
                        <button
                            onClick={handleInitializeDefaults}
                            className="btn-primary mt-4"
                        >
                            ایجاد تنظیمات پیش‌فرض
                        </button>
                    </div>
                )}
            </div>

            {/* Important Settings Highlight */}
            <div className="card-modern p-6 bg-warning-50 border-2 border-warning-200">
                <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-warning-600 flex-shrink-0 mt-1" />
                    <div>
                        <h3 className="font-bold text-warning-800 mb-2">تنظیمات مهم JWT Token</h3>
                        <p className="text-sm text-warning-700 mb-3">
                            تغییر این تنظیمات بر امنیت سیستم تأثیر می‌گذارد. مقادیر پیشنهادی:
                        </p>
                        <ul className="text-sm text-warning-700 space-y-1 mr-4">
                            <li className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <strong>JWT_ACCESS_TOKEN_LIFETIME:</strong> 15 دقیقه (امنیت بالا) یا 60 دقیقه (راحتی کاربر)
                            </li>
                            <li className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <strong>JWT_REFRESH_TOKEN_LIFETIME:</strong> 1440 دقیقه (1 روز) یا 10080 دقیقه (7 روز)
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
