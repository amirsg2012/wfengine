// src/components/workflow/TransitionButton.jsx
import React, { useState } from 'react';
import { ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { performTransition } from '../../api/workflows';

/**
 * TransitionButton - Shows available transitions for configurable workflows
 */
export default function TransitionButton({ workflow, transition, onTransitionComplete }) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleTransition = async () => {
        if (!transition.condition_met) {
            setError('شرایط انتقال هنوز برآورده نشده است');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await performTransition(workflow.id, transition.id);
            if (onTransitionComplete) {
                onTransitionComplete(result);
            }
        } catch (err) {
            console.error('Transition failed:', err);
            setError(err.response?.data?.message || 'خطا در انتقال وضعیت');
        } finally {
            setLoading(false);
        }
    };

    const canTransition = transition.condition_met && !loading;

    return (
        <div className="space-y-2">
            <button
                onClick={handleTransition}
                disabled={!canTransition}
                className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
                    ${canTransition
                        ? 'bg-success-50 border-success-500 text-success-700 hover:bg-success-100 hover:shadow-md'
                        : 'bg-gray-50 border-gray-300 text-gray-400 cursor-not-allowed'
                    }
                `}
            >
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : canTransition ? (
                    <CheckCircle className="w-5 h-5" />
                ) : (
                    <AlertCircle className="w-5 h-5" />
                )}

                <div className="flex-1 text-right">
                    <div className="font-semibold">
                        {transition.name_fa || transition.name}
                    </div>
                    <div className="text-xs opacity-75">
                        انتقال به: {transition.to_state.name_fa}
                    </div>
                </div>

                <ArrowRight className="w-5 h-5" />
            </button>

            {error && (
                <div className="flex items-center gap-2 text-error-600 text-sm p-2 bg-error-50 rounded">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error}</span>
                </div>
            )}

            {!transition.condition_met && (
                <div className="text-xs text-text-secondary px-2">
                    {transition.condition_type === 'ALL_STEPS_APPROVED' && (
                        'تمام مراحل تایید باید تکمیل شود'
                    )}
                    {transition.condition_type === 'ANY_STEP_APPROVED' && (
                        'حداقل یک مرحله باید تایید شود'
                    )}
                    {transition.condition_type === 'FIELD_VALUE' && (
                        'مقدار فیلد مورد نظر باید تامین شود'
                    )}
                </div>
            )}
        </div>
    );
}
