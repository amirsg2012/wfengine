// src/components/letters/ActionBar.jsx
import React from 'react';
import { Save, RefreshCw, Check, Undo, Loader2, Info } from 'lucide-react';

export default function ActionBar({
    actions,
    onSave,
    saving = false,
    onAdvance,
    advancing = false,
    onRefresh,
    onOpenReturn
}) {
    const canReturn = actions.can_return && Array.isArray(actions.return_targets) && actions.return_targets.length > 0;
    const canApprove = actions.can_approve; // This matches your backend response
    const hasNextStep = actions.next_step_index !== null && actions.next_step_index !== undefined;

    return (
        <div className="bg-surface border-t rounded-b-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Left Actions - Smaller buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {actions.can_save_form && (
                    <button 
                        onClick={onSave} 
                        disabled={saving} 
                        className="btn-ghost !py-2 !px-3 !text-sm w-full sm:w-auto"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        <span>{saving ? 'ذخیره...' : 'ذخیره'}</span>
                    </button>
                )}
                <button 
                    onClick={onRefresh} 
                    className="btn-ghost !py-2 !px-3 !text-sm w-full sm:w-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>بروزرسانی</span>
                </button>
            </div>

            {/* Center - Step Info */}
            {hasNextStep && (
                <div className="flex items-center gap-2 text-sm text-text-secondary bg-primary-50 px-3 py-1 rounded-lg">
                    <Info className="w-4 h-4" />
                    <span>مرحله {(actions.next_step_index || 0) + 1} از {actions.steps_total || 0}</span>
                </div>
            )}

            {/* Right Actions - Smaller buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
                {canReturn && (
                    <button 
                        onClick={onOpenReturn} 
                        className="btn-ghost !text-error-500 !py-2 !px-3 !text-sm w-full sm:w-auto"
                    >
                        <Undo className="w-4 h-4" />
                        <span>بازگشت</span>
                    </button>
                )}
                
                {canApprove && (
                    <button 
                        onClick={onAdvance} 
                        disabled={advancing} 
                        className="btn-primary !py-2 !px-4 !text-sm w-full sm:w-auto"
                    >
                        {advancing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        <span>{advancing ? 'در حال تأیید...' : 'تأیید و ارسال'}</span>
                    </button>
                )}

                {/* Show needed roles if user cannot approve */}
                {!canApprove && hasNextStep && actions.needed_roles?.length > 0 && (
                    <div className="text-xs text-text-secondary bg-warning-50 px-2 py-1 rounded border">
                        نیاز به: {actions.needed_roles.join(', ')}
                    </div>
                )}
            </div>
        </div>
    );
}