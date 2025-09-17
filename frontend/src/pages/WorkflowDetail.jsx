// src/pages/WorkflowDetail.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    FileText, 
    User, 
    Calendar, 
    Settings, 
    ArrowRight, 
    Check, 
    X, 
    AlertCircle,
    Clock,
    MessageSquare,
    Eye,
    EyeOff
} from 'lucide-react';
import api from '../api/client';
import DetailsCard from '../components/letters/DetailsCard';
import LetterSkeleton from '../components/letters/LetterSkeleton';

export default function WorkflowDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [letter, setLetter] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('details');
    const [showSensitive, setShowSensitive] = useState(false);
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        fetchLetter();
    }, [id]);

    const fetchLetter = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/letters/${id}/`);
            setLetter(response.data);
        } catch (err) {
            setError(err.response?.data?.detail || 'خطا در بارگذاری جزئیات درخواست');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!letter?.can_approve) return;
        
        try {
            setApproving(true);
            await api.post(`/letters/${id}/approve/`);
            await fetchLetter(); // Refresh data
        } catch (err) {
            console.error('Approval failed:', err);
            // Handle error (could add toast notification here)
        } finally {
            setApproving(false);
        }
    };

    if (loading) {
        return <LetterSkeleton />;
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-error-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-text-primary mb-2">خطا در بارگذاری</h2>
                <p className="text-text-secondary mb-6">{error}</p>
                <button 
                    onClick={() => navigate('/letters')} 
                    className="btn-primary"
                >
                    بازگشت به فهرست
                </button>
            </div>
        );
    }

    const tabs = [
        { id: 'details', label: 'جزئیات', icon: FileText },
        { id: 'workflow', label: 'گردش کار', icon: Clock },
        { id: 'comments', label: 'نظرات', icon: MessageSquare }
    ];

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <button 
                            onClick={() => navigate('/letters')} 
                            className="btn-ghost !p-2"
                        >
                            <ArrowRight className="w-5 h-5" />
                        </button>
                        <h1 className="text-2xl font-bold text-text-primary">
                            {letter.title}
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="badge-info">{letter.state}</span>
                        <span className="text-sm text-text-secondary">
                            شناسه: {letter.id}
                        </span>
                    </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowSensitive(!showSensitive)}
                        className="btn-ghost flex items-center gap-2"
                    >
                        {showSensitive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span>{showSensitive ? 'مخفی کردن' : 'نمایش'} اطلاعات حساس</span>
                    </button>
                    
                    {letter.can_approve && (
                        <button
                            onClick={handleApprove}
                            disabled={approving}
                            className="btn-primary flex items-center gap-2"
                        >
                            {approving ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" />
                            )}
                            <span>{approving ? 'در حال تایید...' : 'تایید و ارسال'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Card */}
            <div className="card-modern !p-0 overflow-hidden">
                {/* Tab Navigation */}
                <div className="border-b-2 border-primary-100 flex items-center px-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-4 border-b-2 transition-all duration-200 ${
                                activeTab === tab.id
                                    ? 'border-primary-500 text-primary-600 bg-primary-50'
                                    : 'border-transparent text-text-secondary hover:text-primary-500 hover:bg-primary-25'
                            }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            <span className="font-medium">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'details' && (
                        <DetailsCard letter={letter} showSensitive={showSensitive} />
                    )}
                    
                    {activeTab === 'workflow' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary mb-4">وضعیت گردش کار</h3>
                            <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-primary-700">وضعیت فعلی:</span>
                                    <span className="badge-info">{letter.state}</span>
                                </div>
                                {letter.pending_step !== undefined && letter.total_steps_in_state && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-primary-700">مرحله:</span>
                                        <span className="text-sm text-primary-600">
                                            {letter.pending_step + 1} از {letter.total_steps_in_state}
                                        </span>
                                    </div>
                                )}
                            </div>
                            
                            {letter.can_approve && (
                                <div className="bg-success-50 rounded-xl p-4 border border-success-200">
                                    <div className="flex items-center gap-3">
                                        <Check className="w-5 h-5 text-success-600" />
                                        <span className="text-sm font-medium text-success-700">
                                            شما می‌توانید این درخواست را تایید کنید
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'comments' && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-text-primary mb-4">نظرات و تاریخچه</h3>
                            <div className="text-center py-8 text-text-secondary">
                                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>هنوز نظری ثبت نشده است</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Action Bar */}
                <div className="bg-surface border-t rounded-b-2xl p-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <button className="btn-ghost text-sm px-4 py-2">
                            چاپ
                        </button>
                        <button className="btn-ghost text-sm px-4 py-2">
                            دانلود
                        </button>
                    </div>
                    
                    <div className="text-xs text-text-secondary">
                        آخرین بروزرسانی: {new Date(letter.updated_at).toLocaleDateString('fa-IR')}
                    </div>
                </div>
            </div>
        </div>
    );
}