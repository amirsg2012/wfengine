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
            setHasSignature(data.has_signature);
        } catch (err) {
            console.error('Failed to check signature:', err);
        }
    };

    const handleApplySignature = async () => {
        if (!hasSignature) {
            alert('لطفا ابتدا امضای خود را در پروفایل خود آپلود کنید');
            return;
        }

        try {
            setApplyingSignature(true);
            const result = await applySignature(workflowId, formNumber, fieldPath);

            // Call parent callback with signature data
            if (onSignatureApplied) {
                onSignatureApplied({
                    signatureUrl: result.signature_url,
                    signatureHash: result.signature_hash,
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

            {signatureData?.signatureUrl ? (
                /* Display existing signature */
                <SignatureDisplay
                    signature={signatureData}
                    workflowId={workflowId}
                    formNumber={formNumber}
                    fieldPath={fieldPath}
                    showVerification={true}
                />
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
                            disabled={applyingSignature || !hasSignature}
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

                    {!hasSignature && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                            <p>شما هنوز امضای دیجیتال خود را آپلود نکرده‌اید.</p>
                            <p className="mt-1">لطفا ابتدا به پروفایل خود بروید و امضای خود را آپلود کنید.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SignatureField;
