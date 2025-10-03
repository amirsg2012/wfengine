// frontend/src/components/forms/Form2.jsx
/**
 * @deprecated This component is deprecated and will be removed in a future version.
 * Use DynamicFormRenderer instead for dynamic form rendering based on API schemas.
 *
 * This file is kept for reference only. The WorkflowDetail page now uses
 * DynamicFormRenderer which fetches forms from /api/dynamic-forms/ endpoint.
 */
import React, { useState, useEffect } from 'react';
import { User, FileText, Calendar, X, Check, AlertCircle, Save, ArrowRight, UserCheck, Building, Pen } from 'lucide-react';
import api from '../../api/client';
import { getMySignature, applySignature } from '../../api/signatures';
import SignatureDisplay from '../signature/SignatureDisplay';

const FormField = ({ label, required, error, helper, children }) => (
    <div className="space-y-2">
        <label className="block text-sm font-medium text-text-primary">
            {label}
            {required && <span className="text-error-500 mr-1">*</span>}
        </label>
        {children}
        {error && (
            <div className="flex items-center gap-2 text-sm text-error-600">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
            </div>
        )}
        {helper && !error && (
            <p className="text-xs text-text-secondary">{helper}</p>
        )}
    </div>
);

const DateInput = ({ value, onChange, disabled, placeholder }) => (
    <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-modern"
        disabled={disabled}
        placeholder={placeholder}
    />
);

export default function Form2({ workflowId, isEditable, onSave, onSubmit }) {
    const [formData, setFormData] = useState({
        applicantDetails: {
            name: '',
            fatherName: '',
            nationalCode: '',
            isRepresentative: false,
            powerOfAttorneyNumber: '',
            notaryOfficeNumber: '',
            propertyOwnerName: ''
        },
        propertyDetails: {
            address: '',
            registrationPlateNumber: ''
        },
        agreement: {
            contactNumber: '',
            signatureDate: '',
            signatureUrl: '',
            signatureHash: '',
            signedBy: '',
            signedAt: ''
        }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [hasSignature, setHasSignature] = useState(false);
    const [applyingSignature, setApplyingSignature] = useState(false);

    // Load existing form data
    useEffect(() => {
        loadFormData();
        checkUserSignature();
    }, [workflowId]);

    const checkUserSignature = async () => {
        try {
            const data = await getMySignature();
            setHasSignature(data.has_signature);
        } catch (err) {
            console.error('Failed to check signature:', err);
        }
    };

    const loadFormData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/workflow-forms/${workflowId}/forms/2/`);
            if (response.data.data) {
                setFormData(prev => ({
                    ...prev,
                    ...response.data.data
                }));
            }
        } catch (err) {
            console.error('Failed to load form data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
        // Clear error when user starts typing
        if (errors[`${section}.${field}`]) {
            setErrors(prev => ({
                ...prev,
                [`${section}.${field}`]: null
            }));
        }
    };

    const validateForm = () => {
        const newErrors = {};
        const { applicantDetails } = formData;

        // Required field validation
        if (!applicantDetails.name?.trim()) {
            newErrors['applicantDetails.name'] = 'نام متقاضی الزامی است';
        }
        if (!applicantDetails.nationalCode?.trim()) {
            newErrors['applicantDetails.nationalCode'] = 'کد ملی الزامی است';
        } else if (!/^\d{10}$/.test(applicantDetails.nationalCode)) {
            newErrors['applicantDetails.nationalCode'] = 'کد ملی باید ۱۰ رقم باشد';
        }

        // Representative fields validation
        if (applicantDetails.isRepresentative) {
            if (!applicantDetails.powerOfAttorneyNumber?.trim()) {
                newErrors['applicantDetails.powerOfAttorneyNumber'] = 'شماره وکالتنامه الزامی است';
            }
            if (!applicantDetails.propertyOwnerName?.trim()) {
                newErrors['applicantDetails.propertyOwnerName'] = 'نام مالک ملک الزامی است';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            await api.post(`/workflow-forms/${workflowId}/forms/2/`, formData);
            onSave?.();
        } catch (err) {
            console.error('Failed to save form:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleApplySignature = async () => {
        if (!hasSignature) {
            alert('لطفا ابتدا امضای خود را در پروفایل خود آپلود کنید');
            return;
        }

        try {
            setApplyingSignature(true);
            const result = await applySignature(workflowId, 2, 'agreement.signatureUrl');

            // Update form data with signature
            setFormData(prev => ({
                ...prev,
                agreement: {
                    ...prev.agreement,
                    signatureUrl: result.signature_url,
                    signatureHash: result.signature_hash,
                    signedBy: result.signed_by || '',
                    signedAt: result.signed_at
                }
            }));
        } catch (err) {
            console.error('Failed to apply signature:', err);
            alert('خطا در اعمال امضا');
        } finally {
            setApplyingSignature(false);
        }
    };

    const handleSubmitAndNext = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            // Save form data
            await api.post(`/workflow-forms/${workflowId}/forms/2/`, formData);
            // Move to next state
            await api.post(`/workflows/${workflowId}/approve/`);
            onSubmit?.();
        } catch (err) {
            console.error('Failed to submit form:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Form Header */}
            <div className="bg-gradient-to-l from-primary-50 to-transparent p-6 rounded-xl">
                <h2 className="text-xl font-bold text-text-primary mb-2">فرم ۲: تعهدنامه متقاضی</h2>
                <p className="text-text-secondary">تکمیل جزئیات متقاضی و تأیید اطلاعات</p>
            </div>

            {/* Applicant Details */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-500" />
                    مشخصات متقاضی
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        label="نام و نام خانوادگی متقاضی"
                        required
                        error={errors['applicantDetails.name']}
                        helper={formData.applicantDetails.name ? "این اطلاعات از فرم ۱ گرفته شده" : undefined}
                    >
                        <input
                            type="text"
                            value={formData.applicantDetails.name}
                            onChange={(e) => handleInputChange('applicantDetails', 'name', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="نام و نام خانوادگی"
                        />
                    </FormField>

                    <FormField label="نام پدر">
                        <input
                            type="text"
                            value={formData.applicantDetails.fatherName}
                            onChange={(e) => handleInputChange('applicantDetails', 'fatherName', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="نام پدر"
                        />
                    </FormField>

                    <FormField
                        label="کد ملی"
                        required
                        error={errors['applicantDetails.nationalCode']}
                        helper={formData.applicantDetails.nationalCode ? "این اطلاعات از فرم ۱ گرفته شده" : undefined}
                    >
                        <input
                            type="text"
                            value={formData.applicantDetails.nationalCode}
                            onChange={(e) => handleInputChange('applicantDetails', 'nationalCode', e.target.value)}
                            className="input-modern font-mono"
                            disabled={!isEditable}
                            placeholder="کد ملی ۱۰ رقمی"
                            maxLength={10}
                        />
                    </FormField>

                    {/* Representative Toggle */}
                    <FormField label="نوع متقاضی">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="isRepresentative"
                                    checked={!formData.applicantDetails.isRepresentative}
                                    onChange={() => handleInputChange('applicantDetails', 'isRepresentative', false)}
                                    disabled={!isEditable}
                                    className="text-primary-500"
                                />
                                <span className="text-sm">مالک</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="isRepresentative"
                                    checked={formData.applicantDetails.isRepresentative}
                                    onChange={() => handleInputChange('applicantDetails', 'isRepresentative', true)}
                                    disabled={!isEditable}
                                    className="text-primary-500"
                                />
                                <span className="text-sm">نماینده</span>
                            </label>
                        </div>
                    </FormField>
                </div>

                {/* Representative-specific fields */}
                {formData.applicantDetails.isRepresentative && (
                    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                        <h4 className="font-semibold text-blue-800 flex items-center gap-2">
                            <UserCheck className="w-5 h-5" />
                            اطلاعات نمایندگی
                        </h4>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField
                                label="شماره وکالتنامه"
                                required
                                error={errors['applicantDetails.powerOfAttorneyNumber']}
                            >
                                <input
                                    type="text"
                                    value={formData.applicantDetails.powerOfAttorneyNumber}
                                    onChange={(e) => handleInputChange('applicantDetails', 'powerOfAttorneyNumber', e.target.value)}
                                    className="input-modern"
                                    disabled={!isEditable}
                                    placeholder="شماره وکالتنامه"
                                />
                            </FormField>

                            <FormField label="شماره دفتر خانه">
                                <input
                                    type="text"
                                    value={formData.applicantDetails.notaryOfficeNumber}
                                    onChange={(e) => handleInputChange('applicantDetails', 'notaryOfficeNumber', e.target.value)}
                                    className="input-modern"
                                    disabled={!isEditable}
                                    placeholder="شماره دفتر خانه"
                                />
                            </FormField>

                            <FormField
                                label="نام مالک ملک"
                                required
                                error={errors['applicantDetails.propertyOwnerName']}
                            >
                                <input
                                    type="text"
                                    value={formData.applicantDetails.propertyOwnerName}
                                    onChange={(e) => handleInputChange('applicantDetails', 'propertyOwnerName', e.target.value)}
                                    className="input-modern"
                                    disabled={!isEditable}
                                    placeholder="نام مالک ملک"
                                />
                            </FormField>
                        </div>
                    </div>
                )}
            </div>

            {/* Property Details */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary-500" />
                    مشخصات ملک
                </h3>

                <FormField
                    label="آدرس ملک"
                    helper={formData.propertyDetails.address ? "این اطلاعات از فرم ۱ گرفته شده" : undefined}
                >
                    <textarea
                        value={formData.propertyDetails.address}
                        onChange={(e) => handleInputChange('propertyDetails', 'address', e.target.value)}
                        className="input-modern resize-none"
                        rows={3}
                        disabled={!isEditable}
                        placeholder="آدرس کامل ملک"
                    />
                </FormField>

                <FormField
                    label="شماره پلاک ثبتی"
                    helper={formData.propertyDetails.registrationPlateNumber ? "این اطلاعات از فرم ۱ گرفته شده" : undefined}
                >
                    <input
                        type="text"
                        value={formData.propertyDetails.registrationPlateNumber}
                        onChange={(e) => handleInputChange('propertyDetails', 'registrationPlateNumber', e.target.value)}
                        className="input-modern"
                        disabled={!isEditable}
                        placeholder="شماره پلاک ثبتی ملک"
                    />
                </FormField>
            </div>

            {/* Agreement Section */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    تعهدنامه و امضاء
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <FormField label="شماره تماس">
                        <input
                            type="tel"
                            value={formData.agreement.contactNumber}
                            onChange={(e) => handleInputChange('agreement', 'contactNumber', e.target.value)}
                            className="input-modern font-mono"
                            disabled={!isEditable}
                            placeholder="شماره تماس"
                        />
                    </FormField>

                    <FormField label="تاریخ امضاء">
                        <DateInput
                            value={formData.agreement.signatureDate}
                            onChange={(value) => handleInputChange('agreement', 'signatureDate', value)}
                            disabled={!isEditable}
                            placeholder="تاریخ امضاء"
                        />
                    </FormField>
                </div>

                {/* Digital Signature Section */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Pen className="w-5 h-5" />
                        امضاء دیجیتال
                    </h4>

                    {formData.agreement.signatureUrl ? (
                        /* Display existing signature */
                        <SignatureDisplay
                            signature={{
                                signatureUrl: formData.agreement.signatureUrl,
                                signatureHash: formData.agreement.signatureHash,
                                signedBy: formData.agreement.signedBy,
                                signedAt: formData.agreement.signedAt
                            }}
                            workflowId={workflowId}
                            formNumber={2}
                            fieldPath="agreement.signatureUrl"
                            showVerification={true}
                        />
                    ) : (
                        /* Show apply signature button */
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                برای تکمیل فرم، امضای دیجیتال خود را اعمال کنید
                            </p>

                            {isEditable && (
                                <button
                                    type="button"
                                    onClick={handleApplySignature}
                                    disabled={applyingSignature || !hasSignature}
                                    className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {applyingSignature ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            در حال اعمال امضا...
                                        </>
                                    ) : (
                                        <>
                                            <Pen className="w-4 h-4" />
                                            اعمال امضای من
                                        </>
                                    )}
                                </button>
                            )}

                            {!hasSignature && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                                    <p>شما هنوز امضای دیجیتال خود را آپلود نکرده‌اید.</p>
                                    <p className="mt-1">لطفا ابتدا به پروفایل خود بروید و امضای خود را آپلود کنید.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action Buttons */}
            {isEditable && (
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-ghost flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'در حال ذخیره...' : 'ذخیره'}
                    </button>
                    
                    <button
                        onClick={handleSubmitAndNext}
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                در حال ارسال...
                            </>
                        ) : (
                            <>
                                <ArrowRight className="w-4 h-4" />
                                ارسال و انتقال به مرحله بعد
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
}