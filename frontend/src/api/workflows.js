// src/api/workflows.js
import api from './client';

/**
 * API client for configurable workflow operations
 */

/**
 * Get list of workflow templates
 */
export const getWorkflowTemplates = async () => {
    const response = await api.get('/workflow-templates/');
    return response.data;
};

export const workflowApi = {
  /**
   * Get detailed workflow information including configurable workflow data
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} Workflow info with template, state, and step data
   */
  getWorkflowInfo: async (workflowId) => {
    const response = await api.get(`/workflows/${workflowId}/workflow_info/`);
    return response.data;
  },

  /**
   * Get available transitions for a configurable workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} List of available transitions with condition status
   */
  getAvailableTransitions: async (workflowId) => {
    const response = await api.get(`/workflows/${workflowId}/available_transitions/`);
    return response.data;
  },

  /**
   * Perform a specific transition
   * @param {string} workflowId - Workflow ID
   * @param {string} transitionId - Transition ID to perform
   * @returns {Promise} Result with new state
   */
  performTransition: async (workflowId, transitionId) => {
    const response = await api.post(`/workflows/${workflowId}/perform_transition/`, {
      transition_id: transitionId,
    });
    return response.data;
  },

  /**
   * Get workflow list
   * @returns {Promise} List of workflows
   */
  getWorkflows: async () => {
    const response = await api.get('/workflows/');
    return response.data;
  },

  /**
   * Get single workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} Workflow data
   */
  getWorkflow: async (workflowId) => {
    const response = await api.get(`/workflows/${workflowId}/`);
    return response.data;
  },

  /**
   * Get workflow status (legacy)
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} Workflow status
   */
  getWorkflowStatus: async (workflowId) => {
    const response = await api.get(`/workflows/${workflowId}/status/`);
    return response.data;
  },

  /**
   * Approve workflow at current step
   * @param {string} workflowId - Workflow ID
   * @param {object} data - Additional approval data
   * @returns {Promise} Approval result
   */
  approveWorkflow: async (workflowId, data = {}) => {
    const response = await api.post(`/workflows/${workflowId}/approve/`, data);
    return response.data;
  },

  /**
   * Manually trigger state transition (legacy)
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} Transition result
   */
  triggerTransition: async (workflowId) => {
    const response = await api.post(`/workflows/${workflowId}/transition/`);
    return response.data;
  },

  /**
   * Get workflow actions (audit trail)
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} List of actions
   */
  getWorkflowActions: async (workflowId) => {
    const response = await api.get(`/workflows/${workflowId}/actions/`);
    return response.data;
  },

  /**
   * Get workflow comments
   * @param {string} workflowId - Workflow ID
   * @returns {Promise} List of comments
   */
  getWorkflowComments: async (workflowId) => {
    const response = await api.get(`/workflows/${workflowId}/comments/`);
    return response.data;
  },

  /**
   * Create new workflow
   * @param {object} workflowData - Workflow data
   * @returns {Promise} Created workflow
   */
  createWorkflow: async (workflowData) => {
    const response = await api.post('/workflows/', workflowData);
    return response.data;
  },

  /**
   * Update workflow
   * @param {string} workflowId - Workflow ID
   * @param {object} workflowData - Updated workflow data
   * @returns {Promise} Updated workflow
   */
  updateWorkflow: async (workflowId, workflowData) => {
    const response = await api.put(`/workflows/${workflowId}/`, workflowData);
    return response.data;
  },

  /**
   * Delete workflow
   * @param {string} workflowId - Workflow ID
   * @returns {Promise}
   */
  deleteWorkflow: async (workflowId) => {
    const response = await api.delete(`/workflows/${workflowId}/`);
    return response.data;
  },
};

// Export individual functions for direct import
export const getWorkflowInfo = workflowApi.getWorkflowInfo;
export const getAvailableTransitions = workflowApi.getAvailableTransitions;
export const performTransition = workflowApi.performTransition;
export const getWorkflows = workflowApi.getWorkflows;
export const getWorkflow = workflowApi.getWorkflow;
export const getWorkflowStatus = workflowApi.getWorkflowStatus;
export const approveWorkflow = workflowApi.approveWorkflow;
export const triggerTransition = workflowApi.triggerTransition;
export const getWorkflowActions = workflowApi.getWorkflowActions;
export const getWorkflowComments = workflowApi.getWorkflowComments;
export const createWorkflow = workflowApi.createWorkflow;
export const updateWorkflow = workflowApi.updateWorkflow;
export const deleteWorkflow = workflowApi.deleteWorkflow;

export default workflowApi;
