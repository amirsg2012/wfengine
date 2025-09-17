// src/components/letters/LetterHeader.jsx
import React from 'react';
import StateChip from './StateChip';
import { FileText, Hash, Calendar } from 'lucide-react';

export default function LetterHeader({ title, id, stateLabel, actions, createdAt, applicantName }) {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fa-IR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex-1">
                <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center flex-shrink-0">
                        <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary leading-tight">
                            {title || `\u062f\u0631\u062e\u0648\u0627\u0633\u062a \u06af\u0631\u062f\u0634 \u06a9\u0627\u0631`}
                        </h1>
                        {applicantName && (
                            <p className="text-text-secondary mt-1">\u0645\u062a\u0642\u0627\u0636\u06cc: {applicantName}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <StateChip label={stateLabel} size="default" />
                    
                    <div className="flex items-center gap-1 text-sm text-text-secondary bg-surface px-2 py-1 rounded-lg">
                        <Hash className="w-4 h-4" />
                        <span>#{id}</span>
                    </div>

                    {createdAt && (
                        <div className="flex items-center gap-1 text-sm text-text-secondary">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(createdAt)}</span>
                        </div>
                    )}
                </div>
            </div>

            {actions && (
                <div className="flex items-center gap-2 self-start lg:self-center flex-shrink-0">
                    {actions}
                </div>
            )}
        </div>
    );
}