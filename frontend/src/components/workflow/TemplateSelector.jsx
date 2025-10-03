// src/components/workflow/TemplateSelector.jsx
import React, { useState, useEffect } from 'react';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import api from '../../api/client';

/**
 * TemplateSelector - Select workflow template when creating new workflow
 */
export default function TemplateSelector({ selectedTemplate, onSelect }) {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        try {
            const response = await api.get('/workflow-templates/');
            setTemplates(response.data.filter(t => t.is_active));
        } catch (err) {
            console.error('Failed to load templates:', err);
            setError('خطا در دریافت قالب‌ها');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-error-600 text-center p-4">
                {error}
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <div className="text-text-secondary text-center p-4">
                قالب فعالی یافت نشد
            </div>
        );
    }

    // If only one template, auto-select it
    if (templates.length === 1 && !selectedTemplate) {
        setTimeout(() => onSelect(templates[0]), 0);
    }

    return (
        <div className="space-y-3">
            <label className="block font-semibold text-sm text-text-primary">
                نوع گردش کار
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((template) => {
                    const isSelected = selectedTemplate?.id === template.id;

                    return (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => onSelect(template)}
                            className={`
                                relative p-4 rounded-lg border-2 text-right transition-all
                                ${isSelected
                                    ? 'border-primary-500 bg-primary-50 shadow-md'
                                    : 'border-gray-200 bg-white hover:border-primary-300 hover:shadow-sm'
                                }
                            `}
                        >
                            <div className="flex items-start gap-3">
                                <FileText className={`w-6 h-6 flex-shrink-0 ${isSelected ? 'text-primary-600' : 'text-gray-400'}`} />

                                <div className="flex-1">
                                    <div className="font-bold text-base text-text-primary">
                                        {template.name_fa || template.name}
                                    </div>

                                    {template.description && (
                                        <div className="text-xs text-text-secondary mt-1">
                                            {template.description}
                                        </div>
                                    )}

                                    <div className="text-xs text-text-tertiary mt-2">
                                        کد: {template.code}
                                    </div>
                                </div>

                                {isSelected && (
                                    <CheckCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
