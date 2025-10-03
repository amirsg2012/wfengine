// frontend/src/components/forms/Form3.jsx
/**
 * @deprecated This component is deprecated and will be removed in a future version.
 * Use DynamicFormRenderer instead for dynamic form rendering based on API schemas.
 *
 * This file is kept for reference only. The WorkflowDetail page now uses
 * DynamicFormRenderer which fetches forms from /api/dynamic-forms/ endpoint.
 */
import React, { useState, useEffect } from 'react';
import {
    Building, FileText, Calendar, AlertCircle, Save, ArrowRight,
    Pen, CheckCircle, Shield, MapPin, FileCheck, FileX
} from 'lucide-react';
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

const CheckboxField = ({ label, checked, onChange, disabled }) => (
    <label className="flex items-center gap-2 cursor-pointer">
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 text-primary-500 rounded"
        />
        <span className="text-sm text-text-primary">{label}</span>
    </label>
);

// Progress indicator component
const ProgressIndicator = ({ currentStep, totalSteps, completedSteps }) => {
    const percentage = (completedSteps.length / totalSteps) * 100;

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">پیشرفت تأییدیه‌ها</span>
                <span className="text-sm font-bold text-primary-600">
                    {completedSteps.length} / {totalSteps}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                />
            </div>
            <p className="text-xs text-gray-500 mt-2">
                مرحله فعلی: {currentStep} از {totalSteps}
            </p>
        </div>
    );
};

// Step indicator component
const StepIndicator = ({ step, isActive, isCompleted, description }) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${
        isActive ? 'bg-primary-50 border-primary-300' :
        isCompleted ? 'bg-green-50 border-green-300' :
        'bg-gray-50 border-gray-200'
    }`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
            isCompleted ? 'bg-green-500 text-white' :
            isActive ? 'bg-primary-500 text-white' :
            'bg-gray-300 text-gray-600'
        }`}>
            {isCompleted ? <CheckCircle className="w-5 h-5" /> : step}
        </div>
        <div className="flex-1">
            <p className={`text-sm font-medium ${
                isActive ? 'text-primary-700' :
                isCompleted ? 'text-green-700' :
                'text-gray-600'
            }`}>
                {description}
            </p>
        </div>
    </div>
);

export default function Form3({ workflowId, isEditable, onSave, onSubmit }) {
    const [formData, setFormData] = useState({
        requestNumber: '',
        requestDate: '',
        clientName: '',
        legalDeputyReport: {
            ownerName: '',
            hasBenchaghAndDeed: false,
            isMortgaged: false,
            isSingleSheetDeed: false,
            hasLegalAuthorityToTransfer: false,
            isTransferToShahrBankPermissible: false,
            isPowerOfAttorneyApproved: false,
            isOwnershipVerified: false,
            isPropertyBannedFromTransactions: false,
            description: '',
            headOfContractsSignature: null,
            legalDeputySignature: null
        },
        realEstateDeputyReport: {
            registrationPlateNumber: '',
            parcelNumber: '',
            propertyArea: '',
            propertyAddress: '',
            landUseType: '',
            propertyLocation: '',
            buildingPermitDate: '',
            noViolationCertificateDate: '',
            generalCompletionCertificateDate: '',
            apartmentCompletionCertificateDate: '',
            hasApartmentSeparationMinutes: false,
            hasTenant: false,
            documentsVerified: false,
            landUseInDetailedPlan: '',
            hasCoolingAndHeatingSystem: false,
            hasFireAlarmAndExtinguishingSystem: false,
            hasFireDeptCertificate: false,
            hasElevatorCertificate: false,
            levyBill: {
                hasBill: false,
                number: '',
                date: ''
            },
            isUrbanPlanningTransferPermissible: false,
            hasAdversary: false,
            isTransferPermissibleAfterValuation: false,
            description: '',
            urbanPlanningManagerSignature: null,
            acquisitionManagerSignature: null,
            realEstateDeputySignature: null
        },
        finalApproval: {
            ceoSignature: null,
            chairmanOfTheBoardSignature: null
        }
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState({});
    const [hasSignature, setHasSignature] = useState(false);
    const [applyingSignature, setApplyingSignature] = useState(false);
    const [currentStepInfo, setCurrentStepInfo] = useState(null);
    const [completionStatus, setCompletionStatus] = useState(null);
    const [permissions, setPermissions] = useState({
        canView: false,
        canEdit: false,
        editableSections: {}
    });

    // APPROVAL_STEPS definition matching backend
    const APPROVAL_STEPS = {
        1: {
            role: 'LC_CONTRACTS_ASSEMBLIES_LEAD',
            action: 'fill_legal_report',
            section: 'legalDeputyReport',
            description: 'تکمیل گزارش معاونت حقوقی'
        },
        2: {
            role: 'LC_MANAGER',
            action: 'approve_legal_report',
            section: 'legalDeputyReport',
            signature_field: 'headOfContractsSignature',
            description: 'تأیید گزارش حقوقی توسط مدیر'
        },
        3: {
            role: 'RE_TECH_URBANISM_LEAD',
            action: 'fill_realestate_report',
            section: 'realEstateDeputyReport',
            description: 'تکمیل گزارش معاونت املاک'
        },
        4: {
            role: 'RE_ACQUISITION_REGEN_LEAD',
            action: 'approve_acquisition',
            section: 'realEstateDeputyReport',
            signature_field: 'acquisitionManagerSignature',
            description: 'تأیید توسط مدیر تملیک'
        },
        5: {
            role: 'RE_MANAGER',
            action: 'approve_realestate_report',
            section: 'realEstateDeputyReport',
            signature_field: 'realEstateDeputySignature',
            description: 'تأیید گزارش املاک توسط معاون'
        },
        6: {
            role: 'CEO_MANAGER',
            action: 'ceo_final_approval',
            section: 'finalApproval',
            signature_field: 'ceoSignature',
            description: 'تأیید نهایی مدیرعامل'
        },
        7: {
            role: 'CHAIRMAN_OF_BOARD',
            action: 'chairman_final_approval',
            section: 'finalApproval',
            signature_field: 'chairmanOfTheBoardSignature',
            description: 'تأیید نهایی رئیس هیئت مدیره'
        }
    };

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
            const response = await api.get(`/workflow-forms/${workflowId}/forms/3/`);

            if (response.data.data) {
                setFormData(prev => ({
                    ...prev,
                    ...response.data.data
                }));
            }

            // Get current step info and permissions
            if (response.data.current_step_info) {
                setCurrentStepInfo(response.data.current_step_info);
            }

            if (response.data.completion_status) {
                setCompletionStatus(response.data.completion_status);
            }

            if (response.data.permissions) {
                setPermissions(response.data.permissions);
            }
        } catch (err) {
            console.error('Failed to load form data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (section, field, value) => {
        if (section.includes('.')) {
            // Nested field like realEstateDeputyReport.levyBill.hasBill
            const [mainSection, subSection, subField] = section.split('.');
            setFormData(prev => ({
                ...prev,
                [mainSection]: {
                    ...prev[mainSection],
                    [subSection]: {
                        ...prev[mainSection][subSection],
                        [subField]: value
                    }
                }
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: value
                }
            }));
        }
    };

    const handleTopLevelChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const validateForm = () => {
        const newErrors = {};

        // Basic validation - can be expanded based on requirements
        if (!formData.clientName?.trim()) {
            newErrors['clientName'] = 'نام مشتری الزامی است';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) return;

        try {
            setSaving(true);
            await api.post(`/workflow-forms/${workflowId}/forms/3/`, formData);
            onSave?.();
            // Reload to get updated step info
            await loadFormData();
        } catch (err) {
            console.error('Failed to save form:', err);
            alert('خطا در ذخیره فرم');
        } finally {
            setSaving(false);
        }
    };

    const handleApplySignature = async (fieldPath) => {
        if (!hasSignature) {
            alert('لطفا ابتدا امضای خود را در پروفایل خود آپلود کنید');
            return;
        }

        try {
            setApplyingSignature(true);
            const result = await applySignature(workflowId, 3, fieldPath);

            // Update form data with signature
            const [section, field] = fieldPath.split('.');
            setFormData(prev => ({
                ...prev,
                [section]: {
                    ...prev[section],
                    [field]: {
                        signatureUrl: result.signature_url,
                        signatureHash: result.signature_hash,
                        signedBy: result.signed_by || '',
                        signedAt: result.signed_at
                    }
                }
            }));

            // Reload to get updated step info
            await loadFormData();
        } catch (err) {
            console.error('Failed to apply signature:', err);
            alert('خطا در اعمال امضا');
        } finally {
            setApplyingSignature(false);
        }
    };

    const handleApprove = async () => {
        if (!validateForm()) return;

        try {
            setSubmitting(true);
            // Save form data first
            await api.post(`/workflow-forms/${workflowId}/forms/3/`, formData);
            // Then approve
            await api.post(`/workflows/${workflowId}/approve/`);
            onSubmit?.();
        } catch (err) {
            console.error('Failed to approve:', err);
            alert('خطا در تأیید فرم');
        } finally {
            setSubmitting(false);
        }
    };

    const canEditSection = (section) => {
        return isEditable && permissions.editableSections?.[section];
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="animate-pulse space-y-4">
                    {[...Array(8)].map((_, i) => (
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
                <h2 className="text-xl font-bold text-text-primary mb-2">
                    فرم ۳: بررسی وضعیت ملک
                </h2>
                <p className="text-text-secondary">
                    گزارش معاونت حقوقی و املاک
                </p>
            </div>

            {/* Progress Indicator */}
            {completionStatus && (
                <ProgressIndicator
                    currentStep={currentStepInfo?.step_number || 1}
                    totalSteps={7}
                    completedSteps={completionStatus.completed_steps || []}
                />
            )}

            {/* Step Flow Indicator */}
            <div className="card-modern space-y-3">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3">
                    مراحل تأیید
                </h3>
                {Object.entries(APPROVAL_STEPS).map(([stepNum, stepInfo]) => (
                    <StepIndicator
                        key={stepNum}
                        step={parseInt(stepNum)}
                        isActive={currentStepInfo?.step_number === parseInt(stepNum)}
                        isCompleted={completionStatus?.completed_steps?.includes(parseInt(stepNum))}
                        description={stepInfo.description}
                    />
                ))}
            </div>

            {/* Basic Information */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3">
                    اطلاعات پایه
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <FormField label="شماره درخواست">
                        <input
                            type="text"
                            value={formData.requestNumber}
                            onChange={(e) => handleTopLevelChange('requestNumber', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="شماره درخواست"
                        />
                    </FormField>

                    <FormField label="تاریخ درخواست">
                        <DateInput
                            value={formData.requestDate}
                            onChange={(value) => handleTopLevelChange('requestDate', value)}
                            disabled={!isEditable}
                            placeholder="تاریخ درخواست"
                        />
                    </FormField>

                    <FormField label="نام مشتری" required error={errors['clientName']}>
                        <input
                            type="text"
                            value={formData.clientName}
                            onChange={(e) => handleTopLevelChange('clientName', e.target.value)}
                            className="input-modern"
                            disabled={!isEditable}
                            placeholder="نام مشتری"
                        />
                    </FormField>
                </div>
            </div>

            {/* Legal Deputy Report Section */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary-500" />
                    گزارش معاونت حقوقی
                </h3>

                <FormField label="نام مالک">
                    <input
                        type="text"
                        value={formData.legalDeputyReport.ownerName}
                        onChange={(e) => handleInputChange('legalDeputyReport', 'ownerName', e.target.value)}
                        className="input-modern"
                        disabled={!canEditSection('legalDeputyReport')}
                        placeholder="نام مالک ملک"
                    />
                </FormField>

                <div className="grid md:grid-cols-2 gap-4">
                    <CheckboxField
                        label="بنچاق و سند ملکیت دارد"
                        checked={formData.legalDeputyReport.hasBenchaghAndDeed}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'hasBenchaghAndDeed', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="ملک رهنی است"
                        checked={formData.legalDeputyReport.isMortgaged}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'isMortgaged', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="سند تک برگی است"
                        checked={formData.legalDeputyReport.isSingleSheetDeed}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'isSingleSheetDeed', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="صلاحیت حقوقی انتقال دارد"
                        checked={formData.legalDeputyReport.hasLegalAuthorityToTransfer}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'hasLegalAuthorityToTransfer', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="انتقال به بانک شهر مجاز است"
                        checked={formData.legalDeputyReport.isTransferToShahrBankPermissible}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'isTransferToShahrBankPermissible', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="وکالتنامه تأیید شده"
                        checked={formData.legalDeputyReport.isPowerOfAttorneyApproved}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'isPowerOfAttorneyApproved', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="مالکیت تأیید شده"
                        checked={formData.legalDeputyReport.isOwnershipVerified}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'isOwnershipVerified', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />

                    <CheckboxField
                        label="ملک ممنوع المعامله است"
                        checked={formData.legalDeputyReport.isPropertyBannedFromTransactions}
                        onChange={(val) => handleInputChange('legalDeputyReport', 'isPropertyBannedFromTransactions', val)}
                        disabled={!canEditSection('legalDeputyReport')}
                    />
                </div>

                <FormField label="توضیحات">
                    <textarea
                        value={formData.legalDeputyReport.description}
                        onChange={(e) => handleInputChange('legalDeputyReport', 'description', e.target.value)}
                        className="input-modern resize-none"
                        rows={4}
                        disabled={!canEditSection('legalDeputyReport')}
                        placeholder="توضیحات تکمیلی"
                    />
                </FormField>

                {/* Legal Manager Signature (Step 2) */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Pen className="w-5 h-5" />
                        امضای مدیر حقوقی
                    </h4>

                    {formData.legalDeputyReport.headOfContractsSignature ? (
                        <SignatureDisplay
                            signature={formData.legalDeputyReport.headOfContractsSignature}
                            workflowId={workflowId}
                            formNumber={3}
                            fieldPath="legalDeputyReport.headOfContractsSignature"
                            showVerification={true}
                        />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                مدیر حقوقی باید گزارش را تأیید کند
                            </p>
                            {canEditSection('legalDeputyReport') && currentStepInfo?.step_number === 2 && (
                                <button
                                    type="button"
                                    onClick={() => handleApplySignature('legalDeputyReport.headOfContractsSignature')}
                                    disabled={applyingSignature || !hasSignature}
                                    className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50"
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
                        </div>
                    )}
                </div>
            </div>

            {/* Real Estate Deputy Report Section */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <Building className="w-5 h-5 text-primary-500" />
                    گزارش معاونت املاک
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                    <FormField label="شماره پلاک ثبتی">
                        <input
                            type="text"
                            value={formData.realEstateDeputyReport.registrationPlateNumber}
                            onChange={(e) => handleInputChange('realEstateDeputyReport', 'registrationPlateNumber', e.target.value)}
                            className="input-modern"
                            disabled={!canEditSection('realEstateDeputyReport')}
                            placeholder="شماره پلاک ثبتی"
                        />
                    </FormField>

                    <FormField label="شماره پلاک ثبت املاک">
                        <input
                            type="text"
                            value={formData.realEstateDeputyReport.parcelNumber}
                            onChange={(e) => handleInputChange('realEstateDeputyReport', 'parcelNumber', e.target.value)}
                            className="input-modern"
                            disabled={!canEditSection('realEstateDeputyReport')}
                            placeholder="شماره پلاک"
                        />
                    </FormField>

                    <FormField label="مساحت ملک (متر مربع)">
                        <input
                            type="number"
                            value={formData.realEstateDeputyReport.propertyArea}
                            onChange={(e) => handleInputChange('realEstateDeputyReport', 'propertyArea', e.target.value)}
                            className="input-modern"
                            disabled={!canEditSection('realEstateDeputyReport')}
                            placeholder="مساحت"
                        />
                    </FormField>

                    <FormField label="نوع کاربری">
                        <input
                            type="text"
                            value={formData.realEstateDeputyReport.landUseType}
                            onChange={(e) => handleInputChange('realEstateDeputyReport', 'landUseType', e.target.value)}
                            className="input-modern"
                            disabled={!canEditSection('realEstateDeputyReport')}
                            placeholder="نوع کاربری"
                        />
                    </FormField>

                    <FormField label="موقعیت ملک">
                        <input
                            type="text"
                            value={formData.realEstateDeputyReport.propertyLocation}
                            onChange={(e) => handleInputChange('realEstateDeputyReport', 'propertyLocation', e.target.value)}
                            className="input-modern"
                            disabled={!canEditSection('realEstateDeputyReport')}
                            placeholder="موقعیت"
                        />
                    </FormField>

                    <FormField label="کاربری در طرح تفصیلی">
                        <input
                            type="text"
                            value={formData.realEstateDeputyReport.landUseInDetailedPlan}
                            onChange={(e) => handleInputChange('realEstateDeputyReport', 'landUseInDetailedPlan', e.target.value)}
                            className="input-modern"
                            disabled={!canEditSection('realEstateDeputyReport')}
                            placeholder="کاربری در طرح تفصیلی"
                        />
                    </FormField>
                </div>

                <FormField label="آدرس ملک">
                    <textarea
                        value={formData.realEstateDeputyReport.propertyAddress}
                        onChange={(e) => handleInputChange('realEstateDeputyReport', 'propertyAddress', e.target.value)}
                        className="input-modern resize-none"
                        rows={3}
                        disabled={!canEditSection('realEstateDeputyReport')}
                        placeholder="آدرس کامل ملک"
                    />
                </FormField>

                {/* Dates */}
                <div className="grid md:grid-cols-2 gap-6">
                    <FormField label="تاریخ پروانه ساختمان">
                        <DateInput
                            value={formData.realEstateDeputyReport.buildingPermitDate}
                            onChange={(val) => handleInputChange('realEstateDeputyReport', 'buildingPermitDate', val)}
                            disabled={!canEditSection('realEstateDeputyReport')}
                        />
                    </FormField>

                    <FormField label="تاریخ گواهی عدم تخلف">
                        <DateInput
                            value={formData.realEstateDeputyReport.noViolationCertificateDate}
                            onChange={(val) => handleInputChange('realEstateDeputyReport', 'noViolationCertificateDate', val)}
                            disabled={!canEditSection('realEstateDeputyReport')}
                        />
                    </FormField>

                    <FormField label="تاریخ پایان کار کلی">
                        <DateInput
                            value={formData.realEstateDeputyReport.generalCompletionCertificateDate}
                            onChange={(val) => handleInputChange('realEstateDeputyReport', 'generalCompletionCertificateDate', val)}
                            disabled={!canEditSection('realEstateDeputyReport')}
                        />
                    </FormField>

                    <FormField label="تاریخ پایان کار واحد">
                        <DateInput
                            value={formData.realEstateDeputyReport.apartmentCompletionCertificateDate}
                            onChange={(val) => handleInputChange('realEstateDeputyReport', 'apartmentCompletionCertificateDate', val)}
                            disabled={!canEditSection('realEstateDeputyReport')}
                        />
                    </FormField>
                </div>

                {/* Checkboxes */}
                <div className="grid md:grid-cols-2 gap-4">
                    <CheckboxField
                        label="صورتجلسه افراز واحد دارد"
                        checked={formData.realEstateDeputyReport.hasApartmentSeparationMinutes}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasApartmentSeparationMinutes', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="دارای مستأجر"
                        checked={formData.realEstateDeputyReport.hasTenant}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasTenant', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="مدارک تأیید شده"
                        checked={formData.realEstateDeputyReport.documentsVerified}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'documentsVerified', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="سیستم سرمایش و گرمایش"
                        checked={formData.realEstateDeputyReport.hasCoolingAndHeatingSystem}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasCoolingAndHeatingSystem', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="سیستم اعلام و اطفاء حریق"
                        checked={formData.realEstateDeputyReport.hasFireAlarmAndExtinguishingSystem}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasFireAlarmAndExtinguishingSystem', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="گواهی آتش نشانی"
                        checked={formData.realEstateDeputyReport.hasFireDeptCertificate}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasFireDeptCertificate', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="گواهی آسانسور"
                        checked={formData.realEstateDeputyReport.hasElevatorCertificate}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasElevatorCertificate', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="انتقال شهرسازی مجاز است"
                        checked={formData.realEstateDeputyReport.isUrbanPlanningTransferPermissible}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'isUrbanPlanningTransferPermissible', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="دارای متخاصم"
                        checked={formData.realEstateDeputyReport.hasAdversary}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'hasAdversary', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    <CheckboxField
                        label="انتقال پس از ارزیابی مجاز است"
                        checked={formData.realEstateDeputyReport.isTransferPermissibleAfterValuation}
                        onChange={(val) => handleInputChange('realEstateDeputyReport', 'isTransferPermissibleAfterValuation', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />
                </div>

                {/* Levy Bill */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-blue-800">عوارض</h4>

                    <CheckboxField
                        label="دارای قبض عوارض"
                        checked={formData.realEstateDeputyReport.levyBill.hasBill}
                        onChange={(val) => handleInputChange('realEstateDeputyReport.levyBill', 'hasBill', val)}
                        disabled={!canEditSection('realEstateDeputyReport')}
                    />

                    {formData.realEstateDeputyReport.levyBill.hasBill && (
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField label="شماره قبض">
                                <input
                                    type="text"
                                    value={formData.realEstateDeputyReport.levyBill.number}
                                    onChange={(e) => handleInputChange('realEstateDeputyReport.levyBill', 'number', e.target.value)}
                                    className="input-modern"
                                    disabled={!canEditSection('realEstateDeputyReport')}
                                    placeholder="شماره قبض"
                                />
                            </FormField>

                            <FormField label="تاریخ قبض">
                                <DateInput
                                    value={formData.realEstateDeputyReport.levyBill.date}
                                    onChange={(val) => handleInputChange('realEstateDeputyReport.levyBill', 'date', val)}
                                    disabled={!canEditSection('realEstateDeputyReport')}
                                />
                            </FormField>
                        </div>
                    )}
                </div>

                <FormField label="توضیحات">
                    <textarea
                        value={formData.realEstateDeputyReport.description}
                        onChange={(e) => handleInputChange('realEstateDeputyReport', 'description', e.target.value)}
                        className="input-modern resize-none"
                        rows={4}
                        disabled={!canEditSection('realEstateDeputyReport')}
                        placeholder="توضیحات تکمیلی"
                    />
                </FormField>

                {/* Signatures for Real Estate Section */}
                {/* Acquisition Manager Signature (Step 4) */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Pen className="w-5 h-5" />
                        امضای مدیر تملیک
                    </h4>

                    {formData.realEstateDeputyReport.acquisitionManagerSignature ? (
                        <SignatureDisplay
                            signature={formData.realEstateDeputyReport.acquisitionManagerSignature}
                            workflowId={workflowId}
                            formNumber={3}
                            fieldPath="realEstateDeputyReport.acquisitionManagerSignature"
                            showVerification={true}
                        />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                مدیر تملیک باید گزارش را تأیید کند
                            </p>
                            {canEditSection('realEstateDeputyReport') && currentStepInfo?.step_number === 4 && (
                                <button
                                    type="button"
                                    onClick={() => handleApplySignature('realEstateDeputyReport.acquisitionManagerSignature')}
                                    disabled={applyingSignature || !hasSignature}
                                    className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50"
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
                        </div>
                    )}
                </div>

                {/* Real Estate Deputy Signature (Step 5) */}
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Pen className="w-5 h-5" />
                        امضای معاون املاک
                    </h4>

                    {formData.realEstateDeputyReport.realEstateDeputySignature ? (
                        <SignatureDisplay
                            signature={formData.realEstateDeputyReport.realEstateDeputySignature}
                            workflowId={workflowId}
                            formNumber={3}
                            fieldPath="realEstateDeputyReport.realEstateDeputySignature"
                            showVerification={true}
                        />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                معاون املاک باید گزارش را تأیید کند
                            </p>
                            {canEditSection('realEstateDeputyReport') && currentStepInfo?.step_number === 5 && (
                                <button
                                    type="button"
                                    onClick={() => handleApplySignature('realEstateDeputyReport.realEstateDeputySignature')}
                                    disabled={applyingSignature || !hasSignature}
                                    className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50"
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
                        </div>
                    )}
                </div>
            </div>

            {/* Final Approval Section */}
            <div className="card-modern space-y-6">
                <h3 className="text-lg font-semibold text-text-primary border-b pb-3 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-primary-500" />
                    تأییدیه نهایی
                </h3>

                {/* CEO Signature (Step 6) */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Pen className="w-5 h-5" />
                        امضای مدیرعامل
                    </h4>

                    {formData.finalApproval.ceoSignature ? (
                        <SignatureDisplay
                            signature={formData.finalApproval.ceoSignature}
                            workflowId={workflowId}
                            formNumber={3}
                            fieldPath="finalApproval.ceoSignature"
                            showVerification={true}
                        />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                مدیرعامل باید فرم را تأیید نهایی کند
                            </p>
                            {canEditSection('finalApproval') && currentStepInfo?.step_number === 6 && (
                                <button
                                    type="button"
                                    onClick={() => handleApplySignature('finalApproval.ceoSignature')}
                                    disabled={applyingSignature || !hasSignature}
                                    className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50"
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
                        </div>
                    )}
                </div>

                {/* Chairman Signature (Step 7) */}
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-4">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                        <Pen className="w-5 h-5" />
                        امضای رئیس هیئت مدیره
                    </h4>

                    {formData.finalApproval.chairmanOfTheBoardSignature ? (
                        <SignatureDisplay
                            signature={formData.finalApproval.chairmanOfTheBoardSignature}
                            workflowId={workflowId}
                            formNumber={3}
                            fieldPath="finalApproval.chairmanOfTheBoardSignature"
                            showVerification={true}
                        />
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-gray-600">
                                رئیس هیئت مدیره باید فرم را تأیید نهایی کند
                            </p>
                            {canEditSection('finalApproval') && currentStepInfo?.step_number === 7 && (
                                <button
                                    type="button"
                                    onClick={() => handleApplySignature('finalApproval.chairmanOfTheBoardSignature')}
                                    disabled={applyingSignature || !hasSignature}
                                    className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50"
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

                    {currentStepInfo?.can_approve && (
                        <button
                            onClick={handleApprove}
                            disabled={submitting}
                            className="btn-primary flex items-center gap-2"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    در حال تأیید...
                                </>
                            ) : (
                                <>
                                    <ArrowRight className="w-4 h-4" />
                                    تأیید و ادامه
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
