// src/components/workflow/WorkflowStateInfo.jsx
import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { workflowApi } from '../../api/workflows';

/**
 * Component to display workflow template and state information
 * Shows configurable workflow metadata
 */
export default function WorkflowStateInfo({ workflowId }) {
  const [workflowInfo, setWorkflowInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadWorkflowInfo();
  }, [workflowId]);

  const loadWorkflowInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workflowApi.getWorkflowInfo(workflowId);
      setWorkflowInfo(data);
    } catch (err) {
      console.error('Failed to load workflow info:', err);
      setError(err.response?.data?.message || 'خطا در بارگذاری اطلاعات گردش کار');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-lg p-6 h-40"></div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">
        <AlertCircle className="w-5 h-5 inline ml-2" />
        {error}
      </div>
    );
  }

  if (!workflowInfo) {
    return null;
  }

  // For non-configurable workflows, show minimal info
  if (!workflowInfo.is_configurable) {
    return (
      <div className="bg-white rounded-lg border border-border-light p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          اطلاعات گردش کار
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">نوع:</span>
            <span className="font-medium">گردش کار قدیمی (FSM)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">وضعیت:</span>
            <span className="font-medium">{workflowInfo.state}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">ایجاد کننده:</span>
            <span className="font-medium">{workflowInfo.created_by}</span>
          </div>
        </div>
      </div>
    );
  }

  // For configurable workflows, show detailed info
  const { configurable } = workflowInfo;
  const progressPercentage = configurable.steps_required > 0
    ? Math.round((Object.keys(configurable.completed_steps[configurable.current_state.id] || {}).length / configurable.steps_required) * 100)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-border-light p-6 space-y-6">
      {/* Template Info */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary-600" />
          قالب گردش کار
        </h3>
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
          <div className="font-semibold text-primary-900">
            {configurable.template.name_fa}
          </div>
          <div className="text-sm text-primary-700 mt-1">
            {configurable.template.code}
          </div>
        </div>
      </div>

      {/* Current State Info */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Clock className="w-5 h-5 text-info-600" />
          وضعیت فعلی
        </h3>
        <div className="bg-info-50 border border-info-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-info-900">
              {configurable.current_state.name_fa}
            </div>
            <span className={`
              px-3 py-1 rounded-full text-xs font-medium
              ${configurable.current_state.state_type === 'FORM'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-purple-100 text-purple-800'}
            `}>
              {configurable.current_state.state_type === 'FORM' ? 'فرم' : 'تایید'}
            </span>
          </div>
          <div className="text-sm text-info-700">
            {configurable.current_state.code}
            {configurable.current_state.form_number && (
              <span className="mr-2">• فرم شماره {configurable.current_state.form_number}</span>
            )}
          </div>
        </div>
      </div>

      {/* Step Progress */}
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success-600" />
          پیشرفت تاییدها
        </h3>
        <div className="space-y-3">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">
                گام {configurable.current_step + 1} از {configurable.steps_required}
              </span>
              <span className="font-medium text-text-primary">
                {progressPercentage}%
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-primary transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Status Badge */}
          <div className={`
            flex items-center gap-2 p-3 rounded-lg
            ${configurable.all_steps_approved
              ? 'bg-success-50 border border-success-200 text-success-800'
              : 'bg-warning-50 border border-warning-200 text-warning-800'}
          `}>
            {configurable.all_steps_approved ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">تمام گام‌ها تایید شده‌اند</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  در انتظار تایید {configurable.steps_required - configurable.current_step} گام
                </span>
              </>
            )}
          </div>

          {/* Completed Steps Details */}
          {Object.keys(configurable.completed_steps[configurable.current_state.id] || {}).length > 0 && (
            <div className="mt-4">
              <div className="text-sm font-medium text-text-secondary mb-2">
                گام‌های تایید شده:
              </div>
              <div className="space-y-2">
                {Object.entries(configurable.completed_steps[configurable.current_state.id] || {}).map(([stepNum, stepData]) => (
                  <div key={stepNum} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded">
                    <CheckCircle className="w-4 h-4 text-success-600 flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">گام {parseInt(stepNum) + 1}</span>
                      <span className="text-text-secondary mr-2">
                        توسط {stepData.by_username}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary">
                      {new Date(stepData.at).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
