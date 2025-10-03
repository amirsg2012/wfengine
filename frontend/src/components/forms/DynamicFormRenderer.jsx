// src/components/forms/DynamicFormRenderer.jsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Loader, Save, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../api/client';

/**
 * DynamicFormRenderer
 *
 * Renders forms dynamically based on schema fetched from API.
 * Supports all field types, validation, computed fields, and data persistence.
 *
 * Props:
 * - workflowId: Workflow ID to fetch/submit data for
 * - formNumber: Form number to render (1, 2, 3, etc.)
 * - onSubmit: Callback when form is successfully submitted
 * - readOnly: Whether form is read-only
 */
const DynamicFormRenderer = ({ workflowId, formNumber, onSubmit, readOnly = false }) => {
    const [schema, setSchema] = useState(null);
    const [formData, setFormData] = useState({});
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState({});
    const [workflowData, setWorkflowData] = useState(null);

    useEffect(() => {
        console.log(`[DynamicFormRenderer] Effect triggered - workflowId: ${workflowId}, formNumber: ${formNumber}`);
        // Reset state when form number changes
        setSchema(null);
        setFormData({});
        setErrors({});
        setSubmitError(null);
        setSubmitSuccess(false);
        setWorkflowData(null);

        fetchWorkflowData();
        fetchFormSchema();
    }, [workflowId, formNumber]);

    useEffect(() => {
        // Initialize collapsed state when schema loads
        if (schema?.sections) {
            const initial = {};
            schema.sections.forEach(section => {
                initial[section.code] = section.is_collapsed_default || false;
            });
            setCollapsedSections(initial);
        }
    }, [schema]);

    useEffect(() => {
        // Inherit data from workflow when both schema and workflow data are available
        // Only inherit if formData is empty (no saved data exists)
        console.log(`[DynamicFormRenderer] Inheritance check - schema:`, !!schema, 'workflowData:', !!workflowData, 'formData keys:', Object.keys(formData).length, 'loading:', loading);

        if (schema && workflowData && Object.keys(formData).length === 0 && !loading) {
            console.log(`[DynamicFormRenderer] ✅ Triggering data inheritance...`);
            inheritDataFromWorkflow();
        }
    }, [schema, workflowData, formData, loading]);

    const fetchFormSchema = async () => {
        try {
            console.log(`[DynamicFormRenderer] Fetching form schema for form_number=${formNumber}`);
            const response = await api.get(`/dynamic-forms/?form_number=${formNumber}`);
            console.log(`[DynamicFormRenderer] Full API response:`, response);
            console.log(`[DynamicFormRenderer] Response.data:`, response.data);
            console.log(`[DynamicFormRenderer] Response.data type:`, typeof response.data, Array.isArray(response.data));

            if (response.data && response.data.length > 0) {
                // Log first form object completely
                console.log(`[DynamicFormRenderer] First form object:`, response.data[0]);
                console.log(`[DynamicFormRenderer] First form keys:`, Object.keys(response.data[0]));

                // Log all form_numbers to debug
                console.log(`[DynamicFormRenderer] All forms:`, response.data.map(f => ({
                    code: f.code,
                    form_number: f.form_number,
                    formNumber_from_api: f.formNumber,
                    form_number_type: typeof f.form_number,
                    formNumber_prop: formNumber,
                    formNumber_type: typeof formNumber,
                    allKeys: Object.keys(f)
                })));

                // Filter client-side to ensure we get the right form
                // Convert both to numbers for comparison
                const matchingForm = response.data.find(f => Number(f.form_number) === Number(formNumber));

                if (!matchingForm) {
                    console.error(`[DynamicFormRenderer] No form found with form_number=${formNumber} in response`);
                    console.error(`[DynamicFormRenderer] Available form_numbers:`, response.data.map(f => f.form_number));
                    setSubmitError(`فرم شماره ${formNumber} یافت نشد`);
                    setLoading(false);
                    return;
                }

                console.log(`[DynamicFormRenderer] Selected form:`, matchingForm);

                // Fetch full schema
                const schemaResponse = await api.get(`/dynamic-forms/${matchingForm.code}/`);
                console.log(`[DynamicFormRenderer] Schema response:`, schemaResponse.data);
                setSchema(schemaResponse.data);

                // Also fetch form data with the form code
                fetchFormDataWithCode(matchingForm.code);
            } else {
                // No dynamic form found - this is expected if forms haven't been created yet
                console.warn(`No dynamic form found for form_number=${formNumber}. Use legacy forms or create dynamic forms in admin.`);
                setSubmitError(`فرم شماره ${formNumber} هنوز در سیستم فرم‌های داینامیک ایجاد نشده است. لطفاً از پنل ادمین فرم را ایجاد کنید.`);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error fetching form schema:', error);
            setSubmitError('خطا در بارگذاری فرم');
            setLoading(false);
        }
    };

    const fetchWorkflowData = async () => {
        try {
            console.log(`[DynamicFormRenderer] Fetching workflow data for workflowId=${workflowId}`);
            // Fetch workflow to get the base data for inheritance
            const response = await api.get(`/workflows/${workflowId}/`);
            console.log(`[DynamicFormRenderer] Workflow response:`, response.data);
            if (response.data && response.data.data) {
                console.log(`[DynamicFormRenderer] Workflow data:`, response.data.data);
                setWorkflowData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching workflow data:', error);
        }
    };

    const fetchFormDataWithCode = async (formCode) => {
        try {
            setLoading(true);
            console.log(`[DynamicFormRenderer] Fetching form data for formCode=${formCode}`);
            // Fetch existing form data
            const response = await api.get(`/workflow-form-data/${workflowId}/?form_code=${formCode}`);
            console.log(`[DynamicFormRenderer] Form data response:`, response.data);

            if (response.data && response.data.data && Object.keys(response.data.data).length > 0) {
                console.log(`[DynamicFormRenderer] Using saved form data`);
                setFormData(response.data.data);
            } else {
                console.log(`[DynamicFormRenderer] No saved form data, will inherit from workflow`);
                // If no form data exists, inheritance will happen in the useEffect
            }
        } catch (error) {
            console.error('Error fetching form data:', error);
            // Inheritance will happen in the useEffect when workflowData is available
        } finally {
            setLoading(false);
        }
    };

    const inheritDataFromWorkflow = () => {
        if (!workflowData || !schema) {
            console.log(`[DynamicFormRenderer] Cannot inherit data - workflowData:`, !!workflowData, 'schema:', !!schema);
            return;
        }

        console.log(`[DynamicFormRenderer] Inheriting data from workflow...`);
        const inheritedData = {};

        // Map common fields from workflow.data to form fields
        schema.sections.forEach(section => {
            section.fields.forEach(field => {
                // Try to find matching data in workflow.data
                const value = findValueInWorkflowData(field.code, workflowData);
                // Only inherit valid values (not undefined, null, empty string, or empty objects)
                if (value !== undefined && value !== null && value !== '') {
                    // Skip empty objects
                    if (typeof value === 'object' && Object.keys(value).length === 0) {
                        console.log(`[DynamicFormRenderer] Skipping empty object for ${field.code}`);
                        return;
                    }
                    console.log(`[DynamicFormRenderer] Inherited ${field.code} = ${value}`);
                    inheritedData[field.code] = value;
                }
            });
        });

        console.log(`[DynamicFormRenderer] Total inherited data:`, inheritedData);
        setFormData(prev => ({ ...inheritedData, ...prev }));
    };

    const findValueInWorkflowData = (fieldCode, data) => {
        // Strip form prefix (e.g., 'form1_firstName' -> 'firstName')
        const baseFieldCode = fieldCode.replace(/^form\d+_/, '');

        // Common field mappings
        const fieldMappings = {
            'firstName': ['personalInformation.firstName', 'applicantDetails.firstName', 'firstName'],
            'lastName': ['personalInformation.lastName', 'applicantDetails.lastName', 'lastName'],
            'nationalCode': ['personalInformation.nationalCode', 'applicantDetails.nationalCode', 'nationalCode'],
            'fullName': ['personalInformation.fullName', 'applicantDetails.name', 'name'],
            'mobileNumber': ['personalInformation.mobileNumber', 'personalInformation.mobile', 'mobileNumber'],
            'phoneNumber': ['personalInformation.phoneNumber', 'personalInformation.mobileNumber', 'personalInformation.mobile', 'phoneNumber', 'mobileNumber'],
            'landlineNumber': ['personalInformation.landlineNumber', 'personalInformation.landline', 'landlineNumber'],
            'address': ['personalInformation.residenceAddress', 'propertyDetails.address', 'address'],
            'registrationPlateNumber': ['propertyRegistrationPlateNumber', 'propertyDetails.registrationPlateNumber', 'registrationPlateNumber'],
            'email': ['personalInformation.email', 'applicantDetails.email', 'email'],
            'birthDate': ['personalInformation.birthDate', 'applicantDetails.birthDate', 'birthDate'],
            'fatherName': ['personalInformation.fatherName', 'applicantDetails.fatherName', 'fatherName'],
            'birthCertificateNumber': ['personalInformation.birthCertificateNumber', 'applicantDetails.birthCertificateNumber', 'birthCertificateNumber'],
            'postalCode': ['personalInformation.postalCode', 'applicantDetails.postalCode', 'postalCode']
        };

        // Check if there's a mapping for this field (using base field code without prefix)
        const possiblePaths = fieldMappings[baseFieldCode] || [baseFieldCode];

        for (const path of possiblePaths) {
            const value = getNestedValue(data, path);
            if (value !== undefined && value !== null && value !== '') {
                console.log(`[DynamicFormRenderer] Found value for ${fieldCode} (${baseFieldCode}) at path ${path}: ${value}`);
                return value;
            }
        }

        return undefined;
    };

    const getNestedValue = (obj, path) => {
        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    };

    const handleFieldChange = (fieldCode, value) => {
        setFormData(prev => ({
            ...prev,
            [fieldCode]: value
        }));

        // Clear error for this field
        if (errors[fieldCode]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[fieldCode];
                return newErrors;
            });
        }

        // Update computed fields
        updateComputedFields(fieldCode, value);
    };

    const updateComputedFields = (changedFieldCode, newValue) => {
        if (!schema) return;

        schema.sections.forEach(section => {
            section.fields.forEach(field => {
                if (field.is_computed && field.source_fields.includes(changedFieldCode)) {
                    // Compute new value
                    let computedValue = field.computation_rule;
                    field.source_fields.forEach(sourceCode => {
                        const sourceValue = sourceCode === changedFieldCode
                            ? newValue
                            : formData[sourceCode] || '';
                        computedValue = computedValue.replace(`{${sourceCode}}`, sourceValue);
                    });

                    setFormData(prev => ({
                        ...prev,
                        [field.code]: computedValue
                    }));
                }
            });
        });
    };

    const validateForm = () => {
        const newErrors = {};

        schema.sections.forEach(section => {
            section.fields.forEach(field => {
                const value = formData[field.code];

                // Check required
                if (field.is_required && (!value || value === '')) {
                    newErrors[field.code] = `${field.name_fa} الزامی است`;
                }

                // Check validation rules
                if (value && field.validation) {
                    const validation = field.validation;

                    // Min length
                    if (validation.minLength && value.length < validation.minLength) {
                        newErrors[field.code] = `حداقل ${validation.minLength} کاراکتر مورد نیاز است`;
                    }

                    // Max length
                    if (validation.maxLength && value.length > validation.maxLength) {
                        newErrors[field.code] = `حداکثر ${validation.maxLength} کاراکتر مجاز است`;
                    }

                    // Min value
                    if (validation.min !== undefined && parseFloat(value) < validation.min) {
                        newErrors[field.code] = `مقدار نمی‌تواند کمتر از ${validation.min} باشد`;
                    }

                    // Max value
                    if (validation.max !== undefined && parseFloat(value) > validation.max) {
                        newErrors[field.code] = `مقدار نمی‌تواند بیشتر از ${validation.max} باشد`;
                    }

                    // Pattern
                    if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
                        newErrors[field.code] = validation.message || 'فرمت نامعتبر';
                    }
                }
            });
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            setSubmitError('لطفاً خطاهای فرم را برطرف کنید');
            return;
        }

        setSubmitting(true);
        setSubmitError(null);
        setSubmitSuccess(false);

        try {
            // Check if we have any file fields
            const hasFiles = Object.values(formData).some(value => value instanceof File);

            if (hasFiles) {
                // Use FormData for file uploads
                const formDataToSend = new FormData();
                formDataToSend.append('form_code', schema.code);

                // Separate files and regular data
                const regularData = {};
                const fileFields = [];

                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    if (value instanceof File) {
                        formDataToSend.append(`file_${key}`, value);
                        fileFields.push(key);
                    } else if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
                        // Skip empty objects
                        return;
                    } else {
                        regularData[key] = value;
                    }
                });

                formDataToSend.append('data', JSON.stringify(regularData));
                formDataToSend.append('file_fields', JSON.stringify(fileFields));

                await api.post(`/workflow-form-data/${workflowId}/submit/`, formDataToSend, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
            } else {
                // Regular JSON submission for non-file forms
                const cleanedData = {};
                Object.keys(formData).forEach(key => {
                    const value = formData[key];
                    // Skip empty objects
                    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
                        return;
                    }
                    // Keep all other values including empty strings (validation will catch required fields)
                    cleanedData[key] = value;
                });

                await api.post(`/workflow-form-data/${workflowId}/submit/`, {
                    form_code: schema.code,
                    data: cleanedData
                });
            }

            setSubmitSuccess(true);

            if (onSubmit) {
                onSubmit();
            }

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSubmitSuccess(false);
            }, 3000);
        } catch (error) {
            console.error('Error submitting form:', error);
            setSubmitError(error.response?.data?.detail || 'خطا در ارسال فرم');
        } finally {
            setSubmitting(false);
        }
    };

    const renderField = (field) => {
        const value = formData[field.code] || field.default_value || '';
        const error = errors[field.code];
        const isReadOnly = readOnly || field.is_readonly || field.is_computed;

        // Determine field width class
        const widthClass = {
            'full': 'col-span-12',
            'half': 'col-span-12 md:col-span-6',
            'third': 'col-span-12 md:col-span-4',
            'quarter': 'col-span-12 md:col-span-3'
        }[field.width] || 'col-span-12';

        // Don't render hidden fields
        if (field.is_hidden) return null;

        // Check conditional visibility
        if (field.show_if_field) {
            const conditionValue = formData[field.show_if_field];
            if (conditionValue !== field.show_if_value) {
                return null;
            }
        }

        return (
            <div key={field.code} className={widthClass}>
                <label className="block mb-2">
                    <span className="text-sm font-medium text-text-primary">
                        {field.name_fa}
                        {field.is_required && <span className="text-error-500 mr-1">*</span>}
                    </span>
                </label>

                {renderFieldInput(field, value, isReadOnly, error)}

                {field.help_text_fa && (
                    <p className="text-xs text-text-secondary mt-1">{field.help_text_fa}</p>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-sm text-error-600 mt-1">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        );
    };

    const renderFieldInput = (field, value, isReadOnly, error) => {
        const baseInputClass = `input-modern ${error ? '!border-error-500' : ''}`;

        switch (field.field_type) {
            case 'TEXT':
            case 'EMAIL':
            case 'PHONE':
                return (
                    <input
                        type={field.field_type === 'EMAIL' ? 'email' : field.field_type === 'PHONE' ? 'tel' : 'text'}
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        placeholder={field.placeholder_fa}
                        disabled={isReadOnly}
                        className={baseInputClass}
                    />
                );

            case 'TEXTAREA':
                return (
                    <textarea
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        placeholder={field.placeholder_fa}
                        disabled={isReadOnly}
                        rows={4}
                        className={`${baseInputClass} resize-none`}
                    />
                );

            case 'NUMBER':
                return (
                    <input
                        type="number"
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        placeholder={field.placeholder_fa}
                        disabled={isReadOnly}
                        className={`${baseInputClass} font-mono`}
                    />
                );

            case 'DATE':
                return (
                    <input
                        type="date"
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        disabled={isReadOnly}
                        className={baseInputClass}
                    />
                );

            case 'DATETIME':
                return (
                    <input
                        type="datetime-local"
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        disabled={isReadOnly}
                        className={baseInputClass}
                    />
                );

            case 'SELECT':
                return (
                    <select
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        disabled={isReadOnly}
                        className={baseInputClass}
                    >
                        <option value="">انتخاب کنید...</option>
                        {field.options.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label_fa || option.label}
                            </option>
                        ))}
                    </select>
                );

            case 'CHECKBOX':
                return (
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={value === true || value === 'true'}
                            onChange={(e) => handleFieldChange(field.code, e.target.checked)}
                            disabled={isReadOnly}
                            className="w-4 h-4 text-primary-500 rounded focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                );

            case 'RADIO':
                return (
                    <div className="space-y-2">
                        {field.options.map(option => (
                            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name={field.code}
                                    value={option.value}
                                    checked={value === option.value}
                                    onChange={(e) => handleFieldChange(field.code, e.target.value)}
                                    disabled={isReadOnly}
                                    className="w-4 h-4 text-primary-500 focus:ring-2 focus:ring-primary-500"
                                />
                                <span className="text-sm text-text-primary">{option.label_fa || option.label}</span>
                            </label>
                        ))}
                    </div>
                );

            case 'FILE':
            case 'IMAGE':
                // Check if value is a URL (string) or File object
                const isFileUrl = typeof value === 'string' && value.startsWith('http');
                const isFileObject = value instanceof File;

                return (
                    <div className="space-y-3">
                        {/* Show existing file/image if it's a URL */}
                        {isFileUrl && (
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                {field.field_type === 'IMAGE' ? (
                                    <div className="space-y-2">
                                        <img
                                            src={value}
                                            alt={field.name_fa}
                                            className="max-w-full h-auto max-h-64 rounded-lg mx-auto"
                                        />
                                        <div className="flex items-center justify-between text-xs text-text-secondary">
                                            <span>فایل آپلود شده</span>
                                            <a
                                                href={value}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary-600 hover:underline"
                                            >
                                                مشاهده تصویر
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-text-primary">فایل آپلود شده</span>
                                        <a
                                            href={value}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-sm text-primary-600 hover:underline"
                                        >
                                            دانلود فایل
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Show file name if a new file is selected */}
                        {isFileObject && (
                            <div className="text-sm text-text-secondary bg-primary-50 px-3 py-2 rounded-lg">
                                فایل انتخاب شده: {value.name}
                            </div>
                        )}

                        {/* File input */}
                        {!isReadOnly && (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-primary-400 transition-colors">
                                <input
                                    type="file"
                                    accept={field.field_type === 'IMAGE' ? 'image/*' : undefined}
                                    onChange={(e) => handleFieldChange(field.code, e.target.files[0])}
                                    disabled={isReadOnly}
                                    className="w-full text-sm text-text-secondary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                                />
                                {isFileUrl && (
                                    <p className="text-xs text-text-tertiary mt-2">
                                        انتخاب فایل جدید جایگزین فایل فعلی می‌شود
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                );

            default:
                return (
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleFieldChange(field.code, e.target.value)}
                        placeholder={field.placeholder_fa}
                        disabled={isReadOnly}
                        className={baseInputClass}
                    />
                );
        }
    };

    const toggleSection = (sectionCode) => {
        setCollapsedSections(prev => ({
            ...prev,
            [sectionCode]: !prev[sectionCode]
        }));
    };

    const renderSection = (section) => {
        const isCollapsed = collapsedSections[section.code] || false;

        return (
            <div key={section.code} className="card-modern space-y-6">
                <div
                    className={`flex items-center justify-between pb-3 border-b ${
                        section.is_collapsible ? 'cursor-pointer' : ''
                    }`}
                    onClick={() => section.is_collapsible && toggleSection(section.code)}
                >
                    <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary-500" />
                        {section.name_fa}
                    </h3>
                    {section.is_collapsible && (
                        <button type="button" className="text-text-secondary hover:text-primary-500 transition-colors">
                            {isCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
                        </button>
                    )}
                </div>

                {section.description && !isCollapsed && (
                    <p className="text-sm text-text-secondary -mt-2">{section.description}</p>
                )}

                {!isCollapsed && (
                    <div className="grid grid-cols-12 gap-6">
                        {section.fields.map(field => renderField(field))}
                    </div>
                )}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (!schema) {
        return (
            <div className="text-center py-12 text-text-secondary">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>فرم یافت نشد</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Form Header */}
            <div className="bg-gradient-to-l from-primary-50 to-transparent p-6 rounded-xl">
                <h2 className="text-xl font-bold text-text-primary mb-2">{schema.name_fa}</h2>
                {schema.description && (
                    <p className="text-text-secondary">{schema.description}</p>
                )}
            </div>

            {/* Form Sections */}
            {schema.sections.map(section => renderSection(section))}

            {/* Error Message */}
            {submitError && (
                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {submitError}
                </div>
            )}

            {/* Success Message */}
            {submitSuccess && (
                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    فرم با موفقیت ارسال شد
                </div>
            )}

            {/* Action Buttons */}
            {!readOnly && (
                <div className="flex items-center justify-end gap-3 pt-6 border-t">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2"
                    >
                        {submitting ? (
                            <>
                                <Loader className="w-4 h-4 animate-spin" />
                                در حال ذخیره...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                ذخیره فرم
                            </>
                        )}
                    </button>
                </div>
            )}
        </form>
    );
};

export default DynamicFormRenderer;
