// src/components/letters/ReturnDialog.jsx
import React, { Fragment, useState } from 'react';
import { Transition } from '@headlessui/react';
import { X, Undo, ChevronDown, AlertTriangle } from 'lucide-react';

export default function ReturnDialog({ 
    open, 
    onClose, 
    targets = [], 
    onConfirm,
    loading = false 
}) {
    const [selectedTarget, setSelectedTarget] = useState('');
    const [note, setNote] = useState('');

    const handleConfirm = () => {
        if (!selectedTarget) return;
        onConfirm(selectedTarget, note);
        // Reset form
        setSelectedTarget('');
        setNote('');
    };

    const handleClose = () => {
        setSelectedTarget('');
        setNote('');
        onClose();
    };

    return (
        <Transition show={open} as={Fragment}>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <Transition.Child 
                    as={Fragment} 
                    enter="ease-out duration-300" 
                    enterFrom="opacity-0" 
                    enterTo="opacity-100" 
                    leave="ease-in duration-200" 
                    leaveFrom="opacity-100" 
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
                </Transition.Child>

                <Transition.Child 
                    as={Fragment} 
                    enter="ease-out duration-300" 
                    enterFrom="opacity-0 scale-95 translate-y-4" 
                    enterTo="opacity-100 scale-100 translate-y-0" 
                    leave="ease-in duration-200" 
                    leaveFrom="opacity-100 scale-100 translate-y-0" 
                    leaveTo="opacity-0 scale-95 translate-y-4"
                >
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg mx-4">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-error-100 rounded-xl flex items-center justify-center">
                                    <Undo className="w-5 h-5 text-error-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-text-primary">بازگشت گردش کار</h3>
                                    <p className="text-sm text-text-secondary">انتقال به مرحله قبلی</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleClose} 
                                className="btn-ghost !p-2 !rounded-xl hover:bg-error-50"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Warning */}
                        <div className="bg-warning-50 border border-warning-200 rounded-xl p-4 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-warning-800 font-medium">
                                        این عمل باعث بازگشت گردش کار به مرحله انتخابی خواهد شد
                                    </p>
                                    <p className="text-xs text-warning-700 mt-1">
                                        لطفاً دلیل بازگشت را به صورت واضح بنویسید
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Form */}
                        <div className="space-y-5">
                            {/* Target Selection */}
                            <div>
                                <label className="block mb-2 font-semibold text-sm text-text-primary">
                                    مرحله مقصد <span className="text-error-500">*</span>
                                </label>
                                <div className="relative">
                                    <select 
                                        value={selectedTarget} 
                                        onChange={(e) => setSelectedTarget(e.target.value)}
                                        className="input-modern appearance-none pr-4 pl-12"
                                        disabled={loading}
                                    >
                                        <option value="" disabled>انتخاب مرحله...</option>
                                        {targets.map(target => (
                                            <option key={target} value={target}>{target}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary pointer-events-none" />
                                </div>
                            </div>

                            {/* Note */}
                            <div>
                                <label className="block mb-2 font-semibold text-sm text-text-primary">
                                    دلیل بازگشت <span className="text-error-500">*</span>
                                </label>
                                <textarea 
                                    value={note} 
                                    onChange={(e) => setNote(e.target.value)}
                                    rows={4} 
                                    className="input-modern resize-none" 
                                    placeholder="دلیل بازگشت گردش کار را به صورت دقیق و واضح بنویسید..."
                                    disabled={loading}
                                />
                                <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-text-secondary">
                                        حداقل 10 کاراکتر
                                    </span>
                                    <span className="text-xs text-text-secondary">
                                        {note.length} کاراکتر
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 mt-8">
                            <button 
                                onClick={handleClose} 
                                className="btn-ghost flex-1"
                                disabled={loading}
                            >
                                انصراف
                            </button>
                            <button 
                                onClick={handleConfirm} 
                                disabled={!selectedTarget || note.length < 10 || loading}
                                className="btn-primary !bg-error-500 hover:!bg-error-600 flex-1"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>در حال بازگشت...</span>
                                    </>
                                ) : (
                                    <>
                                        <Undo className="w-4 h-4" />
                                        <span>تأیید بازگشت</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </Transition.Child>
            </div>
        </Transition>
    );
}