// src/components/workflow/TransitionButtons.jsx
import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, XCircle, Loader } from 'lucide-react';
import { workflowApi } from '../../api/workflows';

/**
 * Component to display available transitions for configurable workflows
 * Shows dynamic buttons based on available transitions instead of generic "Approve" button
 */
export default function TransitionButtons({ workflowId, onTransitionComplete }) {
  const [transitions, setTransitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [performing, setPerforming] = useState(null);
  const [error, setError] = useState(null);
  const [isConfigurable, setIsConfigurable] = useState(false);

  useEffect(() => {
    loadTransitions();
  }, [workflowId]);

  const loadTransitions = async () => {
    try {
      setLoading(true);
      setError(null);

      // First check if workflow is configurable
      const workflowInfo = await workflowApi.getWorkflowInfo(workflowId);
      setIsConfigurable(workflowInfo.is_configurable);

      if (workflowInfo.is_configurable) {
        const data = await workflowApi.getAvailableTransitions(workflowId);
        setTransitions(data.transitions || []);
      }
    } catch (err) {
      console.error('Failed to load transitions:', err);
      if (err.response?.data?.error === 'not_configurable') {
        setIsConfigurable(false);
      } else {
        setError(err.response?.data?.message || 'خطا در بارگذاری گذارها');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePerformTransition = async (transitionId) => {
    try {
      setPerforming(transitionId);
      setError(null);

      const result = await workflowApi.performTransition(workflowId, transitionId);

      // Call callback to refresh workflow data
      if (onTransitionComplete) {
        onTransitionComplete(result);
      }

      // Reload transitions for new state
      await loadTransitions();
    } catch (err) {
      console.error('Failed to perform transition:', err);
      setError(err.response?.data?.message || 'خطا در انجام گذار');
    } finally {
      setPerforming(null);
    }
  };

  // Don't show anything for non-configurable workflows
  if (!isConfigurable) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader className="w-5 h-5 animate-spin text-primary-600" />
        <span className="mr-2 text-text-secondary">در حال بارگذاری گذارهای موجود...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-error-50 border border-error-200 rounded-lg text-error-700">
        <div className="flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="p-4 bg-info-50 border border-info-200 rounded-lg text-info-700">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          <span>هیچ گذار قابل انجامی در حال حاضر وجود ندارد</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-primary">گذارهای موجود</h3>

      <div className="grid grid-cols-1 gap-3">
        {transitions.map((transition) => {
          const isPerforming = performing === transition.id;
          const canPerform = transition.condition_met;

          return (
            <button
              key={transition.id}
              onClick={() => handlePerformTransition(transition.id)}
              disabled={!canPerform || isPerforming}
              className={`
                flex items-center justify-between p-4 rounded-lg border-2 transition-all
                ${canPerform
                  ? 'border-success-300 bg-success-50 hover:bg-success-100 hover:border-success-400'
                  : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                }
                ${isPerforming ? 'opacity-50' : ''}
              `}
            >
              <div className="flex items-center gap-3">
                {canPerform ? (
                  <CheckCircle className="w-5 h-5 text-success-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}

                <div className="text-right">
                  <div className="font-semibold text-text-primary">
                    {transition.name_fa || transition.name}
                  </div>
                  <div className="text-sm text-text-secondary">
                    به {transition.to_state.name_fa}
                  </div>
                  {!canPerform && (
                    <div className="text-xs text-warning-600 mt-1">
                      شرایط گذار برقرار نیست ({transition.condition_type})
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {isPerforming ? (
                  <Loader className="w-5 h-5 animate-spin text-primary-600" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Help text */}
      <div className="text-sm text-text-secondary bg-gray-50 p-3 rounded">
        💡 گذارهای فعال (با علامت ✓) قابل انجام هستند. گذارهای غیرفعال نیازمند تکمیل شرایط هستند.
      </div>
    </div>
  );
}
