// src/components/signature/SignatureField.jsx
import React, { useState, useEffect } from 'react';
import { Pen } from 'lucide-react';
import { getMySignature, applySignature } from '../../api/signatures';
import SignatureDisplay from './SignatureDisplay';

/**
 * Reusable SignatureField Component
 * Manages a single signature field in a form
 *
 * @param {string} workflowId - Workflow ID
 * @param {number} formNumber - Form number (1, 2, or 3)
 * @param {string} fieldPath - JSON path to signature field (e.g., "agreement.signatureUrl")
 * @param {Object} signatureData - Current signature data object with signatureUrl, signatureHash, signedBy, signedAt
 * @param {function} onSignatureApplied - Callback when signature is successfully applied
 * @param {boolean} isEditable - Whether the field is editable
 * @param {string} label - Label for the signature field (optional)
 */
const SignatureField = ({
    workflowId,
    formNumber,
    fieldPath,
    signatureData,
    onSignatureApplied,
    isEditable = true,
    label = 'امضای دیجیتال'
}) => {
    const [hasSignature, setHasSignature] = useState(false);
    const [applyingSignature, setApplyingSignature] = useState(false);

    useEffect(() => {
        checkUserSignature();
    }, []);

    const checkUserSignature = async () => {
        try {
            const data = await getMySignature();
            // With hash-based signatures, users always have a signature (auto-created)
            setHasSignature(true);
        } catch (err) {
            console.error('Failed to check signature:', err);
        }
    };

    const handleApplySignature = async () => {
        try {
            setApplyingSignature(true);
            const result = await applySignature(workflowId, formNumber, fieldPath);

            // Call parent callback with signature data (hash-based, no URL)
            if (onSignatureApplied) {
                onSignatureApplied({
                    signatureHash: result.signature_hash,
                    displayHash: result.display_hash,
                    signedBy: result.signed_by || '',
                    signedAt: result.signed_at
                });
            }
        } catch (err) {
            console.error('Failed to apply signature:', err);
            alert('خطا در اعمال امضا');
        } finally {
            setApplyingSignature(false);
        }
    };

    return (
        <div className="signature-field space-y-4">
            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                <Pen className="w-5 h-5" />
                {label}
            </h4>

            {signatureData?.signatureHash ? (
                /* Display existing signature hash */
                <div className="border border-success-200 bg-success-50 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-success-500 rounded-full"></div>
                                <span className="text-sm font-semibold text-success-900">امضا شده</span>
                            </div>
                            <div className="space-y-1 text-sm text-success-800">
                                <p>
                                    <span className="font-medium">امضا کننده:</span> {signatureData.signedBy}
                                </p>
                                <p>
                                    <span className="font-medium">کد امضا:</span>{' '}
                                    <code className="bg-success-100 px-2 py-1 rounded text-xs font-mono">
                                        {signatureData.displayHash || signatureData.signatureHash?.substring(0, 16)}...
                                    </code>
                                </p>
                                {signatureData.signedAt && (
                                    <p>
                                        <span className="font-medium">تاریخ:</span>{' '}
                                        {new Date(signatureData.signedAt).toLocaleString('fa-IR')}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-center w-12 h-12 bg-success-200 rounded-full">
                            <Pen className="w-6 h-6 text-success-700" />
                        </div>
                    </div>
                </div>
            ) : (
                /* Show apply signature button */
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                        برای تکمیل این بخش، امضای دیجیتال خود را اعمال کنید
                    </p>

                    {isEditable && (
                        <button
                            type="button"
                            onClick={handleApplySignature}
                            disabled={applyingSignature}
                            className="btn-primary flex items-center gap-2 w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {applyingSignature ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    در حال اعمال امضا...
                                </>
                            ) : (
                                <>
                                    <Pen className="w-4 h-4" />
                                    اعمال امضای من
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SignatureField;
