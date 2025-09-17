// src/components/letters/StateChip.jsx
import React from 'react';

export default function StateChip({ label, size = 'default' }) {
    const getStateStyle = (state) => {
        const stateStr = String(state || '').toLowerCase();
        
        // Workflow-specific state mappings
        const stateMap = {
            // Initial states
            'applicantrequest': { class: 'badge-warning', text: '\u062f\u0631\u062e\u0648\u0627\u0633\u062a \u0645\u062a\u0642\u0627\u0636\u06cc' },
            'ceoinstruction': { class: 'badge-info', text: '\u062f\u0633\u062a\u0648\u0631\u0627\u0644\u0639\u0645\u0644 \u0645\u062f\u06cc\u0631\u0639\u0627\u0645\u0644' },
            
            // Form states
            'form1': { class: 'badge-info', text: '\u0641\u0631\u0645 \u06f1' },
            'form2': { class: 'badge-info', text: '\u0641\u0631\u0645 \u06f2' },
            'form3': { class: 'badge-info', text: '\u0641\u0631\u0645 \u06f3' },
            'form4': { class: 'badge-info', text: '\u0641\u0631\u0645 \u06f4' },
            
            // Process states
            'docscollection': { class: 'badge-warning', text: '\u062c\u0645\u0639\u200c\u0622\u0648\u0631\u06cc \u0645\u062f\u0627\u0631\u06a9' },
            'amlform': { class: 'badge-info', text: '\u0641\u0631\u0645 AML' },
            'evaluationcommittee': { class: 'badge-warning', text: '\u06a9\u0645\u06cc\u062a\u0647 \u0627\u0631\u0632\u06cc\u0627\u0628\u06cc' },
            
            // Appraisal states
            'appraisalfeedeposit': { class: 'badge-warning', text: '\u0648\u0627\u0631\u06cc\u0632 \u06a9\u0627\u0631\u0645\u0632\u062f \u0627\u0631\u0632\u06cc\u0627\u0628\u06cc' },
            'appraisalnotice': { class: 'badge-info', text: '\u0627\u0639\u0644\u0627\u0646 \u0627\u0631\u0632\u06cc\u0627\u0628\u06cc' },
            'appraisalopinion': { class: 'badge-info', text: '\u0646\u0638\u0631 \u0627\u0631\u0632\u06cc\u0627\u0628' },
            'appraisaldecision': { class: 'badge-warning', text: '\u062a\u0635\u0645\u06cc\u0645 \u0627\u0631\u0632\u06cc\u0627\u0628\u06cc' },
            
            // Final state
            'settlment': { class: 'badge-success', text: '\u062a\u0633\u0648\u06cc\u0647 \u0634\u062f\u0647' },
        };

        // Check for exact match first
        const exactMatch = stateMap[stateStr];
        if (exactMatch) return exactMatch;

        // Fallback to pattern matching for backwards compatibility
        if (stateStr.includes('settle') || stateStr.includes('complete') || stateStr.includes('\u062a\u0633\u0648\u06cc\u0647') || stateStr.includes('\u062a\u06a9\u0645\u06cc\u0644')) {
            return { class: 'badge-success', text: label };
        }
        if (stateStr.includes('approve') || stateStr.includes('accept') || stateStr.includes('\u062a\u0627\u06cc\u06cc\u062f') || stateStr.includes('\u067e\u0630\u06cc\u0631\u0634')) {
            return { class: 'badge-success', text: label };
        }
        if (stateStr.includes('reject') || stateStr.includes('deny') || stateStr.includes('\u0631\u062f') || stateStr.includes('\u0627\u0646\u06a9\u0627\u0631')) {
            return { class: 'badge-error', text: label };
        }
        if (stateStr.includes('pending') || stateStr.includes('waiting') || stateStr.includes('\u0627\u0646\u062a\u0638\u0627\u0631') || stateStr.includes('\u0645\u0639\u0644\u0642')) {
            return { class: 'badge-warning', text: label };
        }
        if (stateStr.includes('review') || stateStr.includes('draft') || stateStr.includes('\u0628\u0631\u0631\u0633\u06cc') || stateStr.includes('\u067e\u06cc\u0634\u200c\u0646\u0648\u06cc\u0633')) {
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
            title={`\u0648\u0636\u0639\u06cc\u062a: ${displayText}`}
        >
            <span>{displayText || '\u0646\u0627\u0645\u0634\u062e\u0635'}</span>
        </span>
    );
}