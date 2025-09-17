// src/pages/WorkflowCreate.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { FilePlus, Check, X, Loader2, AlertCircle, Info, User, Hash } from 'lucide-react';

// --- Reusable Toast Component ---
const Toast = ({ message, type, onDismiss }) => {
    if (!message) return null;

    const config = {
        success: { icon: Check, bg: 'bg-success-50', text: 'text-success-600', border: 'border-success-200' },
        error: { icon: AlertCircle, bg: 'bg-error-50', text: 'text-error-600', border: 'border-error-200' },
    };
    const { icon: Icon, bg, text, border } = config[type] || { icon: Info, bg: 'bg-primary-50', text: 'text-primary-600', border: 'border-primary-200' };

    useEffect(() => {
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
    }, [message, onDismiss]);

    return (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-xl shadow-2xl border ${bg} ${border} animate-fade-in-up`}>
            <Icon className={`w-6 h-6 ${text}`} />
            <span className={`text-sm font-medium ${text}`}>{message}</span>
            <button onClick={onDismiss} className={`ml-4 p-1 rounded-full hover:bg-black/10 ${text}`}>
                <X className="w-4 h-4" />
            </button>
        </div>
    );
};

// --- Form Field Component ---
const FormField = ({ label, required, error, children, helper }) => (
    <div className="space-y-2">
        <label className="block font-semibold text-sm text-text-primary">
            {label} {required && <span className="text-error-500">*</span>}
        </label>
        {children}
        {error && (
            <div className="flex items-center gap-2 text-error-600 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
            </div>
        )}
        {helper && <p className="text-xs text-text-secondary">{helper}</p>}
    </div>
);

// --- Main Create Component ---
export default function WorkflowCreate() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        body: '',
        applicant_name: '',
        applicant_national_id: ''
    });
    const [errors, setErrors] = useState({});
    const [busy, setBusy] = useState(false);
    const [toast, setToast] = useState({ message: '', type: '' });

const validateForm = () => {
    const newErrors = {};

    // 1. Validate Title
    if (formData.title.trim().length < 5) {
        newErrors.title = 'عنوان درخواست باید حداقل ۵ کاراکتر باشد';
    }

    // 2. Validate Applicant Name
    if (formData.applicant_name.trim().length < 2) {
        newErrors.applicant_name = 'نام و نام خانوادگی نمی‌تواند خالی باشد';
    }

    // 3. Validate National ID
    if (formData.applicant_national_id.trim().length !== 10) {
        newErrors.applicant_national_id = 'کد ملی باید دقیقاً ۱۰ رقم باشد';
    }

    // Update the errors state to show messages in the UI
    setErrors(newErrors);
    

    // Return true if the newErrors object is empty (form is valid)
    return Object.keys(newErrors).length === 0;
};

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error when user starts typing
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: null }));
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            setToast({ message: 'لطفاً خطاهای فرم را برطرف کنید', type: 'error' });
            return;
        }
        console.log("shod")

        setBusy(true);
        try {
            const payload = {
                title: formData.title.trim(),
                body: formData.body.trim(),
                applicant_name: formData.applicant_name.trim(),
                applicant_national_id: formData.applicant_national_id.trim()
            };

            const { data } = await api.post('/workflows/', payload);
            setToast({ message: `درخواست با شناسه ${data.id} ایجاد شد`, type: 'success' });
            setTimeout(() => navigate(`/workflows/${data.id}`), 1500);
        } catch (err) {
            console.error('Failed to create workflow:', err);
            let errorMsg = 'خطا در ایجاد درخواست';

            if (err?.response?.data) {
                const errorData = err.response.data;
                if (typeof errorData === 'string') {
                    errorMsg = errorData;
                } else if (errorData.detail) {
                    errorMsg = errorData.detail;
                } else if (errorData.applicant_national_id) {
                    errorMsg = 'کد ملی: ' + errorData.applicant_national_id[0];
                } else if (errorData.title) {
                    errorMsg = 'عنوان: ' + errorData.title[0];
                }
            }

            setToast({ message: errorMsg, type: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const isFormValid = () => {
        return formData.title.trim().length >= 5 &&
            formData.applicant_name.trim().length >= 2 &&
            formData.applicant_national_id.trim().length === 10 &&
            Object.keys(errors).length === 0;
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 animate-fade-in max-w-4xl mx-auto">
            <Toast message={toast.message} type={toast.type} onDismiss={() => setToast({ message: '', type: '' })} />

            {/* Header */}
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <FilePlus className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">درخواست جدید</h1>
                        <p className="text-text-secondary mt-1">فرم زیر را برای ایجاد درخواست گردش کار جدید تکمیل کنید</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/workflows')}
                        disabled={busy}
                        className="btn-ghost"
                    >
                        انصراف
                    </button>
                </div>
            </header>

            {/* Info Banner */}
            <div className="bg-primary-50 border border-primary-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Info className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-primary-700">
                    <p className="font-medium mb-1">نکات مهم:</p>
                    <ul className="space-y-1 text-xs">
                        <li>• درخواست پس از ایجاد وارد مرحله "درخواست متقاضی" می‌شود</li>
                        <li>• کد ملی وارد شده باید معتبر باشد</li>
                        <li>• بعداً می‌توانید فرم‌های مربوط به هر مرحله را تکمیل کنید</li>
                    </ul>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="card-modern space-y-6">
                {/* Workflow Title */}
                <FormField
                    label="عنوان درخواست"
                    required
                    error={errors.title}
                    helper={`${formData.title.length}/300 کاراکتر`}
                >
                    <div className="relative">
                    <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="عنوان واضح و مختصری برای درخواست وارد کنید"
                        className="input-modern"
                        maxLength={300}
                        disabled={busy}
                        autoComplete="off"
                    />
                    </div>
                </FormField>

                {/* Applicant Information */}
                <div className="border-t pt-6">
                    <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <User className="w-5 h-5 text-primary-500" />
                        اطلاعات متقاضی
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Applicant Name */}
                        <FormField
                            label="نام و نام خانوادگی متقاضی"
                            required
                            error={errors.applicant_name}
                        >
                            <div className="relative">
                                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                <input
                                    type="text"
                                    value={formData.applicant_name}
                                    onChange={(e) => handleInputChange('applicant_name', e.target.value)}
                                    placeholder="نام و نام خانوادگی"
                                    className="input-modern !pr-10"
                                    maxLength={200}
                                    disabled={busy}
                                    autoComplete="name"
                                />
                            </div>
                        </FormField>

                        {/* National ID */}
                        <FormField
                            label="کد ملی"
                            required
                            error={errors.applicant_national_id}
                        >
                            <div className="relative">
                                <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                                <input
                                    type="text"
                                    value={formData.applicant_national_id}
                                    onChange={(e) => {
                                        const value = e.target.value.replace(/\D/g, '');
                                        if (value.length <= 10) {
                                            handleInputChange('applicant_national_id', value);
                                        }
                                    }}
                                    placeholder="کد ملی ۱۰ رقمی"
                                    className="input-modern !pr-10 font-mono"
                                    maxLength={10}
                                    disabled={busy}
                                    autoComplete="off"
                                />
                            </div>
                        </FormField>
                    </div>
                </div>

                {/* Description */}
                <FormField
                    label="توضیحات اولیه"
                    helper="توضیحات اضافی در صورت نیاز (اختیاری)"
                >
                    <div className="relative">
                    <textarea
                        value={formData.body}
                        onChange={(e) => handleInputChange('body', e.target.value)}
                        placeholder="توضیحات، درخواست خاص، یا نکات مهم را در اینجا بنویسید..."
                        rows={6}
                        className="input-modern resize-none"
                        disabled={busy}
                    />
                    </div>
                </FormField>

                {/* Submit Button */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                    <button
                        type="button"
                        onClick={() => navigate('/workflows')}
                        disabled={busy}
                        className="btn-ghost"
                    >
                        انصراف
                    </button>
                    <button
                        type="submit"
                        disabled={busy || !isFormValid()}
                        className="btn-primary min-w-[200px]"
                    >
                        {busy ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>در حال ایجاد...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                <span>ایجاد درخواست</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Next Steps Info */}
            <div className="mt-6 bg-surface border rounded-xl p-4">
                <h4 className="font-semibold text-text-primary mb-2">مراحل بعدی:</h4>
                <div className="text-sm text-text-secondary space-y-1">
                    <p>۱. درخواست در مرحله "درخواست متقاضی" قرار می‌گیرد</p>
                    <p>۲. منتظر تأیید مسئول مربوطه باشید</p>
                    <p>۳. پس از تأیید، فرم‌های مربوطه را تکمیل کنید</p>
                </div>
            </div>
        </div>
    );
}