// src/components/signature/SignatureDisplay.jsx
import React, { useState, useEffect } from 'react';
import { verifySignature } from '../../api/signatures';

/**
 * SignatureDisplay Component
 * Displays a signed signature with metadata and verification status
 *
 * @param {Object} signature - Signature data
 * @param {string} signature.signatureUrl - URL to signature image
 * @param {string} signature.signatureHash - SHA256 hash for integrity
 * @param {string} signature.signedBy - Username who signed
 * @param {string} signature.signedAt - ISO timestamp when signed
 * @param {string} workflowId - Workflow ID (optional, for verification)
 * @param {number} formNumber - Form number (optional, for verification)
 * @param {string} fieldPath - Field path (optional, for verification)
 * @param {boolean} showVerification - Whether to show verification button
 */
const SignatureDisplay = ({
    signature,
    workflowId,
    formNumber,
    fieldPath,
    showVerification = false
}) => {
    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(null);
    const [error, setError] = useState(null);

    if (!signature?.signatureUrl) {
        return (
            <div className="signature-display-empty">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <svg
                        className="mx-auto h-10 w-10 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                        />
                    </svg>
                    <p className="mt-2 text-sm text-gray-500">No signature</p>
                </div>
            </div>
        );
    }

    const handleVerify = async () => {
        if (!workflowId || !formNumber || !fieldPath) {
            setError('Missing verification parameters');
            return;
        }

        setVerifying(true);
        setError(null);

        try {
            const result = await verifySignature(workflowId, formNumber, fieldPath);
            setVerified(result.verified);
        } catch (err) {
            console.error('Verification error:', err);
            setError('Failed to verify signature');
            setVerified(false);
        } finally {
            setVerifying(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    return (
        <div className="signature-display">
            <div className="border rounded-lg p-4 bg-white shadow-sm">
                {/* Signature Image */}
                <div className="mb-3">
                    <img
                        src={signature.signatureUrl}
                        alt={`Signature by ${signature.signedBy || 'Unknown'}`}
                        className="max-h-20 border border-gray-200 rounded p-2 bg-gray-50"
                        onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'block';
                        }}
                    />
                    <div className="hidden text-sm text-red-600">
                        Failed to load signature image
                    </div>
                </div>

                {/* Metadata */}
                <div className="space-y-1 text-xs text-gray-600">
                    {signature.signedBy && (
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-4 w-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                                />
                            </svg>
                            <span>
                                <strong>Signed by:</strong> {signature.signedBy}
                            </span>
                        </div>
                    )}

                    {signature.signedAt && (
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-4 w-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <span>
                                <strong>Signed at:</strong> {formatDate(signature.signedAt)}
                            </span>
                        </div>
                    )}

                    {signature.signatureHash && (
                        <div className="flex items-center gap-2">
                            <svg
                                className="h-4 w-4 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                            <span className="font-mono text-xs truncate" title={signature.signatureHash}>
                                <strong>Hash:</strong> {signature.signatureHash.substring(0, 16)}...
                            </span>
                        </div>
                    )}
                </div>

                {/* Verification Section */}
                {showVerification && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                        {verified === null ? (
                            <button
                                onClick={handleVerify}
                                disabled={verifying}
                                className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {verifying ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Verifying...
                                    </>
                                ) : (
                                    <>
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Verify Signature
                                    </>
                                )}
                            </button>
                        ) : verified ? (
                            <div className="flex items-center gap-2 text-green-700 text-sm bg-green-50 rounded px-3 py-2">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span>Signature verified</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-red-700 text-sm bg-red-50 rounded px-3 py-2">
                                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>Verification failed</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SignatureDisplay;
