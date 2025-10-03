// src/components/signature/SignatureUpload.jsx
import React, { useState, useRef } from 'react';
import { uploadSignature, deleteSignature, getMySignature } from '../../api/signatures';

/**
 * SignatureUpload Component
 * Allows users to upload, update, or delete their digital signature
 */
const SignatureUpload = ({ onUploadSuccess, onDeleteSuccess }) => {
    const [signature, setSignature] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);

    // Load existing signature on mount
    React.useEffect(() => {
        loadSignature();
    }, []);

    const loadSignature = async () => {
        try {
            const data = await getMySignature();
            if (data.has_signature) {
                setSignature(data);
            }
        } catch (err) {
            console.error('Error loading signature:', err);
        }
    };

    const validateFile = (file) => {
        // Check file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
            return 'Only PNG and JPEG images are allowed';
        }

        // Check file size (2MB max)
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            return `File size must be less than 2MB. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`;
        }

        return null;
    };

    const handleFileSelect = async (file) => {
        setError(null);

        // Validate file
        const validationError = validateFile(file);
        if (validationError) {
            setError(validationError);
            return;
        }

        setUploading(true);

        try {
            const data = await uploadSignature(file);
            setSignature({
                has_signature: true,
                signature_url: data.signature_url,
                signature_hash: data.signature_hash,
                uploaded_at: new Date().toISOString()
            });
            setError(null);

            if (onUploadSuccess) {
                onUploadSuccess(data);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Failed to upload signature');
        } finally {
            setUploading(false);
        }
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const file = e.dataTransfer.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete your signature?')) {
            return;
        }

        setUploading(true);
        setError(null);

        try {
            await deleteSignature();
            setSignature(null);

            if (onDeleteSuccess) {
                onDeleteSuccess();
            }
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.response?.data?.message || 'Failed to delete signature');
        } finally {
            setUploading(false);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="signature-upload">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {signature?.has_signature ? (
                <div className="space-y-4">
                    {/* Current Signature Preview */}
                    <div className="border rounded-lg p-4 bg-gray-50">
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Current Signature</h3>
                        <img
                            src={signature.signature_url}
                            alt="Your signature"
                            className="max-h-24 border border-gray-300 rounded bg-white p-2"
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Uploaded: {new Date(signature.uploaded_at).toLocaleDateString()}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handleButtonClick}
                            disabled={uploading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {uploading ? 'Updating...' : 'Update Signature'}
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={uploading}
                            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            ) : (
                /* Upload Area */
                <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    {uploading ? (
                        <div className="space-y-2">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-gray-600">Uploading signature...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <svg
                                className="mx-auto h-12 w-12 text-gray-400"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                            >
                                <path
                                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                            <div>
                                <p className="text-gray-700 font-medium">
                                    Drag and drop your signature here, or
                                </p>
                                <button
                                    onClick={handleButtonClick}
                                    className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                    Browse Files
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                PNG or JPEG, max 2MB
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                    {error}
                </div>
            )}

            {/* Help Text */}
            <div className="mt-4 text-xs text-gray-600">
                <p>Tips for a good signature:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Use a white or transparent background</li>
                    <li>Sign with black or dark blue ink</li>
                    <li>Crop closely around your signature</li>
                    <li>Ensure good lighting and contrast</li>
                </ul>
            </div>
        </div>
    );
};

export default SignatureUpload;
