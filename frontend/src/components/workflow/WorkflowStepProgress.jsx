// src/components/workflow/WorkflowStepProgress.jsx
import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

/**
 * WorkflowStepProgress - Shows approval steps progress for configurable workflows
 */
export default function WorkflowStepProgress({ workflowInfo }) {
    if (!workflowInfo?.is_configurable) {
        return null;
    }

    const { configurable } = workflowInfo;
    const currentState = configurable.current_state;
    const completedSteps = configurable.completed_steps[currentState.id] || {};
    const totalSteps = configurable.steps_required || 0;

    if (totalSteps === 0) {
        return null;
    }

    const steps = Array.from({ length: totalSteps }, (_, i) => {
        const stepNum = i;
        const isCompleted = completedSteps[stepNum] !== undefined;
        const isCurrent = stepNum === configurable.current_step;

        return {
            number: stepNum + 1,
            completed: isCompleted,
            current: isCurrent && !isCompleted,
            data: completedSteps[stepNum]
        };
    });

    return (
        <div className="card-modern">
            <h3 className="text-lg font-bold text-text-primary mb-4">
                پیشرفت تاییدیه‌ها
            </h3>

            <div className="space-y-3">
                {steps.map((step) => (
                    <div
                        key={step.number}
                        className={`
                            flex items-center gap-4 p-3 rounded-lg border
                            ${step.completed ? 'bg-success-50 border-success-200' : ''}
                            ${step.current ? 'bg-primary-50 border-primary-200' : ''}
                            ${!step.completed && !step.current ? 'bg-gray-50 border-gray-200' : ''}
                        `}
                    >
                        {step.completed ? (
                            <CheckCircle className="w-6 h-6 text-success-600 flex-shrink-0" />
                        ) : step.current ? (
                            <Clock className="w-6 h-6 text-primary-600 flex-shrink-0 animate-pulse" />
                        ) : (
                            <Circle className="w-6 h-6 text-gray-400 flex-shrink-0" />
                        )}

                        <div className="flex-1">
                            <div className="font-semibold text-sm">
                                مرحله {step.number}
                            </div>

                            {step.completed && step.data && (
                                <div className="text-xs text-text-secondary mt-1">
                                    تایید شده توسط: {step.data.by_username}
                                    {step.data.role_code && ` (${step.data.role_code})`}
                                    {step.data.at && (
                                        <span className="mr-2">
                                            • {new Date(step.data.at).toLocaleDateString('fa-IR')}
                                        </span>
                                    )}
                                </div>
                            )}

                            {step.current && (
                                <div className="text-xs text-primary-600 mt-1">
                                    در انتظار تایید
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary">پیشرفت کلی</span>
                    <span className="font-bold text-primary-600">
                        {Object.keys(completedSteps).length} از {totalSteps}
                    </span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-success-500 to-success-600 transition-all duration-500"
                        style={{
                            width: `${(Object.keys(completedSteps).length / totalSteps) * 100}%`
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
