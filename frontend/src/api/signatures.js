// src/api/signatures.js
/**
 * API client for digital signature management
 */
import api from './client';

/**
 * Get current user's signature
 * @returns {Promise} - Returns signature data or error
 */
export const getMySignature = async () => {
    try {
        const response = await api.get('/signatures/my_signature/');
        return response.data;
    } catch (error) {
        console.error('Error fetching signature:', error);
        throw error;
    }
};

/**
 * Upload or update user's signature
 * @param {File} file - Signature image file (PNG/JPEG, max 2MB)
 * @returns {Promise} - Returns uploaded signature data
 */
export const uploadSignature = async (file) => {
    try {
        const formData = new FormData();
        formData.append('signature', file);

        const response = await api.post('/signatures/upload/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading signature:', error);
        throw error;
    }
};

/**
 * Delete user's signature
 * @returns {Promise}
 */
export const deleteSignature = async () => {
    try {
        const response = await api.delete('/signatures/delete/');
        return response.data;
    } catch (error) {
        console.error('Error deleting signature:', error);
        throw error;
    }
};

/**
 * Apply user's signature to a form field
 * @param {string} workflowId - Workflow ID
 * @param {number} formNumber - Form number (1, 2, or 3)
 * @param {string} fieldPath - Field path (e.g., "agreement.signatureUrl")
 * @returns {Promise} - Returns applied signature data
 */
export const applySignature = async (workflowId, formNumber, fieldPath) => {
    try {
        const response = await api.post(
            `/workflow-signatures/${workflowId}/apply_signature/`,
            {
                form_number: formNumber,
                field_path: fieldPath
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error applying signature:', error);
        throw error;
    }
};

/**
 * Verify a signature on a form field
 * @param {string} workflowId - Workflow ID
 * @param {number} formNumber - Form number
 * @param {string} fieldPath - Field path
 * @returns {Promise} - Returns verification status
 */
export const verifySignature = async (workflowId, formNumber, fieldPath) => {
    try {
        const response = await api.get(
            `/workflow-signatures/${workflowId}/verify_signature/`,
            {
                params: {
                    form_number: formNumber,
                    field_path: fieldPath
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error verifying signature:', error);
        throw error;
    }
};

/**
 * Get all signatures for a specific form
 * @param {string} workflowId - Workflow ID
 * @param {number} formNumber - Form number
 * @returns {Promise} - Returns list of signatures
 */
export const getFormSignatures = async (workflowId, formNumber) => {
    try {
        const response = await api.get(
            `/workflow-signatures/${workflowId}/form_signatures/`,
            {
                params: { form_number: formNumber }
            }
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching form signatures:', error);
        throw error;
    }
};

/**
 * Get signature audit logs for a workflow
 * @param {string} workflowId - Workflow ID
 * @returns {Promise} - Returns signature logs
 */
export const getSignatureLogs = async (workflowId) => {
    try {
        const response = await api.get(
            `/workflow-signatures/${workflowId}/signature_logs/`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching signature logs:', error);
        throw error;
    }
};

export default {
    getMySignature,
    uploadSignature,
    deleteSignature,
    applySignature,
    verifySignature,
    getFormSignatures,
    getSignatureLogs
};
