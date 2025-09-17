// src/components/letters/StateChip.jsx
import React from 'react';

export default function StateChip({ label, size = 'default' }) {
    const getStateStyle = (state) => {
        const stateStr = String(state || '').toLowerCase();
        
        // Workflow-specific state mappings
        const stateMap = {
            // Initial states
            'applicantrequest': { class: 'badge-warning', text: 'درخواست متقاضی' },
            'ceoinstruction': { class: 'badge-info', text: 'دستورالعمل مدیرعامل' },
            
            // Form states
            'form1': { class: 'badge-info', text: 'فرم ۱' },
            'form2': { class: 'badge-info', text: 'فرم ۲' },
            'form3': { class: 'badge-info', text: 'فرم ۳' },
            'form4': { class: 'badge-info', text: 'فرم ۴' },
            
            // Process states
            'docscollection': { class: 'badge-warning', text: 'جمع‌آوری مدارک' },
            'amlform': { class: 'badge-info', text: 'فرم پولشویی' },
            'evaluationcommittee': { class: 'badge-warning', text: 'کمیته ارزیابی' },
            
            // Appraisal states
            'appraisalfeedeposit': { class: 'badge-warning', text: 'واریز کارمزد ارزیابی' },
            'appraisalnotice': { class: 'badge-info', text: 'اعلان ارزیابی' },
            'appraisalopinion': { class: 'badge-info', text: 'نظر ارزیاب' },
            'appraisaldecision': { class: 'badge-warning', text: 'تصمیم ارزیابی' },
            
            // Final state
            'settlment': { class: 'badge-success', text: 'تسویه شده' },
        };

        // Check for exact match first
        const exactMatch = stateMap[stateStr];
        if (exactMatch) return exactMatch;

        // Fallback to pattern matching for backwards compatibility
        if (stateStr.includes('settle') || stateStr.includes('complete') || stateStr.includes('تسویه') || stateStr.includes('تکمیل')) {
            return { class: 'badge-success', text: label };
        }
        if (stateStr.includes('approve') || stateStr.includes('accept') || stateStr.includes('تایید') || stateStr.includes('پذیرش')) {
            return { class: 'badge-success', text: label };
        }
        if (stateStr.includes('reject') || stateStr.includes('deny') || stateStr.includes('رد') || stateStr.includes('انکار')) {
            return { class: 'badge-error', text: label };
        }
        if (stateStr.includes('pending') || stateStr.includes('waiting') || stateStr.includes('انتظار') || stateStr.includes('معلق')) {
            return { class: 'badge-warning', text: label };
        }
        if (stateStr.includes('review') || stateStr.includes('draft') || stateStr.includes('بررسی') || stateStr.includes('پیش‌نویس')) {
            return { class: 'badge-warning', text: label };
        }

        // Default
        return { class: 'badge-info', text: label };
    };

    const { class: badgeClass, text: displayText } = getStateStyle(label);
    
    // Size variants
    const sizeClasses = {
        small: 'text-xs px-2 py-0.5',
        default: 'text-sm px-2.5 py-1',
        large: 'text-base px-3 py-1.5'
    };

    return (
        <span 
            className={`${badgeClass} ${sizeClasses[size]} font-medium rounded-full inline-flex items-center gap-1`}
            title={`وضعیت: ${displayText}`}
        >
            <span>{displayText || 'نامشخص'}</span>
        </span>
    );
}