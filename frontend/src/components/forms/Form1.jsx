// frontend/src/components/forms/Form1.jsx
import React, { useState, useEffect } from 'react';
import { User, FileText, Upload, Calendar, X, Check, AlertCircle, Save, ArrowRight } from 'lucide-react';
import api from '../../api/client';

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

const FileUpload = ({ label, accept, onUpload, currentFile, onRemove, required, error }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileSelect = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('name', file.name);

            const response = await api.post('/attachments/', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            onUpload(response.data.file); // URL to the uploaded file
        } catch (err) {
            console.error('Upload failed:', err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <FormField label={label} required={required} error={error}>
            <div className="space-y-3">
                {!currentFile ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                        <input
                            type="file"
                            accept={accept}
                            onChange={handleFileSelect}
                            className="hidden"
                            id={`upload-${label}`}
                            disabled={uploading}
                        />
                        <label htmlFor={`upload-${label}`} className="cursor-pointer">
                            <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600 mb-1">
                                {uploading ? 'در حال آپلود...' : 'برای آپلود کلیک کنید'}
                            </p>
                            <p className="text-xs text-gray-500">
                                فرمت‌های مجاز: PDF, JPG, PNG
                            </p>
                        </label>
                    </div>
                ) : (
                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-green-600" />
                            <span className="text-sm text-green-800">فایل آپلود شده</span>
                        </div>
                        <button
                            onClick={() => onRemove()}
                            className="text-red-600 hover:text-red-700"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
        </FormField>
    );
};

export default function Form1({ workflowId, isEditable, onSave, onSubmit }) {
    const [formData, setFormData] = useState({
        personalInformation: {
            firstName: '',
            lastName: '',
            birthCertificateNumber: '',
            nationalCode: '',
            residenceAddress: '',
            emergencyContactNumbers: '',
            landlineNumber: '',
            mobileNumber: ''
        },
        roleAndOwnership: {
            role: 'owner',
            ownershipType: 'mafruz'
        },
        submittedDocuments: {
            ownershipDeed: { file: null, type: 'booklet' },
            benchagh: null,
            buildingPermit: { file: null, date: '' },
            certificateOfNoViolation: { file: null, date: '' },
            buildingCompletionCertificate: { file: null, date: '' },
            representationDocument: { file: null, type: 'legal' },
            imageFiles: []
        },
        propertyRegistrationPlateNumber: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Load existing form data
    useEffect(() => {
        loadFormData();
    }, [workflowId]);

    const loadFormData = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/workflows/forms/${workflowId}/forms/1/`);
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

    const handleDocumentUpload = (docType, fileUrl, additionalData = {}) => {
        setFormData(prev => ({
            ...prev,
            submittedDocuments: {
                ...prev.submittedDocuments,
                [docType]: typeof prev.submittedDocuments[docType] === 'object' && prev.submittedDocuments[docType] !== null
                    ? { ...prev.submittedDocuments[docType], file: fileUrl, ...additionalData }
                    : fileUrl
            }
        }));
    };

    const validateForm = () => {
        const newErrors = {};
        const { personalInformation } = formData;

        // Required field validation
        if (!personalInformation.firstName?.trim()) {
            newErrors['personalInformation.firstName'] = 'نام الزامی است';
        }
        if (!personalInformation.lastName?.trim()) {
            newErrors['personalInformation.lastName'] = 'نام خانوادگی الزامی است';
        }
        if (!personalInformation.nationalCode?.trim()) {
            newErrors['personalInformation.nationalCode'] = 'کد ملی الزامی است';
        } else if (!/^\d{10}$/.test(personalInformation.nationalCode)) {
            newErrors['personalInformation.nationalCode'] = 'کد ملی باید ۱۰ رقم باشد';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            await api.post(`/workflows/forms/${workflowId}/forms/1/`, formData);
            onSave?.();
        } catch (err) {
            console.error('Failed to save form:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitAndNext = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            // Save form data
            await api.post(`/workflows/forms/${workflowId}/forms/1/`, formData);
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
                <h2 className="text-xl font-bold text-text-primary mb-2">فرم ۱: مشخصات و ارائه مدارک</h2>
                <p className="text-text-secondary">لطفاً اطلاعات شخصی و مدارک مورد نیاز را تکمیل کنید</p>
            </div>

            {/* Personal Information */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary-500" />
                    اطلاعات شخصی
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                        label="نام"
                        required
                        error={errors['personalInformation.firstName']}
                    >
                        <input
                            type="text"
                            value={formData.personalInformation.firstName}
                            onChange={(e) => handleInputChange('personalInformation', 'firstName', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="نام خود را وارد کنید"
                        />
                    </FormField>

                    <FormField
                        label="نام خانوادگی"
                        required
                        error={errors['personalInformation.lastName']}
                    >
                        <input
                            type="text"
                            value={formData.personalInformation.lastName}
                            onChange={(e) => handleInputChange('personalInformation', 'lastName', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="نام خانوادگی خود را وارد کنید"
                        />
                    </FormField>

                    <FormField
                        label="کد ملی"
                        required
                        error={errors['personalInformation.nationalCode']}
                    >
                        <input
                            type="text"
                            value={formData.personalInformation.nationalCode}
                            onChange={(e) => handleInputChange('personalInformation', 'nationalCode', e.target.value)}
                            className="input-modern font-mono"
                            disabled={!isEditable}
                            placeholder="کد ملی ۱۰ رقمی"
                            maxLength={10}
                        />
                    </FormField>

                    <FormField label="شماره شناسنامه">
                        <input
                            type="text"
                            value={formData.personalInformation.birthCertificateNumber}
                            onChange={(e) => handleInputChange('personalInformation', 'birthCertificateNumber', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="شماره شناسنامه"
                        />
                    </FormField>

                    <FormField label="تلفن همراه">
                        <input
                            type="tel"
                            value={formData.personalInformation.mobileNumber}
                            onChange={(e) => handleInputChange('personalInformation', 'mobileNumber', e.target.value)}
                            className="input-modern font-mono"
                            disabled={!isEditable}
                            placeholder="09xxxxxxxxx"
                        />
                    </FormField>

                    <FormField label="تلفن ثابت">
                        <input
                            type="tel"
                            value={formData.personalInformation.landlineNumber}
                            onChange={(e) => handleInputChange('personalInformation', 'landlineNumber', e.target.value)}
                            className="input-modern font-mono"
                            disabled={!isEditable}
                            placeholder="021xxxxxxxx"
                        />
                    </FormField>
                </div>

                <FormField label="آدرس محل سکونت">
                    <textarea
                        value={formData.personalInformation.residenceAddress}
                        onChange={(e) => handleInputChange('personalInformation', 'residenceAddress', e.target.value)}
                        className="input-modern resize-none"
                        rows={3}
                        disabled={!isEditable}
                        placeholder="آدرس کامل محل سکونت خود را وارد کنید"
                    />
                </FormField>
            </div>

            {/* Role and Ownership */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3">نقش و نوع مالکیت</h3>
                
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField label="نقش">
                        <select
                            value={formData.roleAndOwnership.role}
                            onChange={(e) => handleInputChange('roleAndOwnership', 'role', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                        >
                            <option value="owner">مالک</option>
                            <option value="representative">نماینده</option>
                        </select>
                    </FormField>

                    <FormField label="نوع مالکیت">
                        <select
                            value={formData.roleAndOwnership.ownershipType}
                            onChange={(e) => handleInputChange('roleAndOwnership', 'ownershipType', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                        >
                            <option value="mafruz">مفروز</option>
                            <option value="musha">مشاع</option>
                        </select>
                    </FormField>
                </div>
            </div>

            {/* Property Registration */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3">شماره پلاک ثبتی</h3>
                
                <FormField label="شماره پلاک ثبتی ملک">
                    <input
                        type="text"
                        value={formData.propertyRegistrationPlateNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, propertyRegistrationPlateNumber: e.target.value }))}
                        className="input-modern"
                        disabled={!isEditable}
                        placeholder="شماره پلاک ثبتی ملک را وارد کنید"
                    />
                </FormField>
            </div>

            {/* Documents */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-500" />
                    مدارک ارائه شده
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <FileUpload
                        label="سند مالکیت"
                        accept=".pdf,.jpg,.jpeg,.png"
                        currentFile={formData.submittedDocuments.ownershipDeed?.file}
                        onUpload={(url) => handleDocumentUpload('ownershipDeed', url)}
                        onRemove={() => handleDocumentUpload('ownershipDeed', null)}
                        required
                    />

                    <FileUpload
                        label="بن‌چاق"
                        accept=".pdf,.jpg,.jpeg,.png"
                        currentFile={formData.submittedDocuments.benchagh}
                        onUpload={(url) => handleDocumentUpload('benchagh', url)}
                        onRemove={() => handleDocumentUpload('benchagh', null)}
                    />

                    <FileUpload
                        label="پروانه ساختمان"
                        accept=".pdf,.jpg,.jpeg,.png"
                        currentFile={formData.submittedDocuments.buildingPermit?.file}
                        onUpload={(url) => handleDocumentUpload('buildingPermit', url)}
                        onRemove={() => handleDocumentUpload('buildingPermit', null)}
                    />

                    <FileUpload
                        label="گواهی عدم تخلف"
                        accept=".pdf,.jpg,.jpeg,.png"
                        currentFile={formData.submittedDocuments.certificateOfNoViolation?.file}
                        onUpload={(url) => handleDocumentUpload('certificateOfNoViolation', url)}
                        onRemove={() => handleDocumentUpload('certificateOfNoViolation', null)}
                    />
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