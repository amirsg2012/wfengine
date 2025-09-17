// src/components/letters/CommentsPanel.jsx
import React, { useState } from 'react';
import { MessageSquare, Send, User, Clock } from 'lucide-react';

const Comment = ({ comment }) => {
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('fa-IR', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get author name from different possible fields
    const authorName = comment.author || comment.author_name || comment.performer || '\u06a9\u0627\u0631\u0628\u0631 \u0646\u0627\u0634\u0646\u0627\u0633';

    return (
        <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                <User className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-text-primary text-sm">{authorName}</span>
                    <div className="flex items-center gap-1 text-xs text-text-secondary">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(comment.created_at)}</span>
                    </div>
                </div>
                <p className="text-sm text-text-primary leading-relaxed break-words">
                    {comment.text || comment.body || '\u0645\u062d\u062a\u0648\u0627\u06cc \u067e\u06cc\u0627\u0645 \u0646\u0627\u0645\u0648\u062c\u0648\u062f'}
                </p>
                {comment.state && (
                    <div className="mt-2">
                        <span className="badge-info text-xs">\u062f\u0631 \u0645\u0631\u062d\u0644\u0647: {comment.state}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function CommentsPanel({
    comments = [],
    loading = false,
    workflowId,
    onAddComment,
    canWrite = false
}) {
    const [newComment, setNewComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!newComment.trim() || !onAddComment) return;
        
        setIsSubmitting(true);
        try {
            await onAddComment(newComment.trim());
            setNewComment('');
        } catch (error) {
            console.error('Failed to add comment:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSubmit();
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                <h3 className="text-lg font-bold text-text-primary">
                    \u0646\u0638\u0631\u0627\u062a \u0648 \u067e\u06cc\u0627\u0645\u200c\u0647\u0627
                </h3>
                <span className="bg-primary-100 text-primary-700 px-2 py-1 rounded-full text-xs font-medium">
                    {comments.length}
                </span>
            </div>

            {/* Add Comment Form */}
            {canWrite && (
                <div className="bg-primary-50 rounded-xl p-4 border border-primary-200">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="\u0646\u0638\u0631 \u06cc\u0627 \u067e\u06cc\u0627\u0645 \u062e\u0648\u062f \u0631\u0627 \u0628\u0646\u0648\u06cc\u0633\u06cc\u062f... (Ctrl+Enter \u0628\u0631\u0627\u06cc \u0627\u0631\u0633\u0627\u0644)"
                        rows={3}
                        className="input-modern mb-3 resize-none"
                        disabled={isSubmitting}
                    />
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-text-secondary">
                            {newComment.length > 0 && `${newComment.length} \u06a9\u0627\u0631\u0627\u06a9\u062a\u0631`}
                        </span>
                        <button 
                            onClick={handleSubmit} 
                            disabled={!newComment.trim() || isSubmitting}
                            className="btn-primary !py-2 !px-4 !text-sm disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>\u062f\u0631 \u062d\u0627\u0644 \u0627\u0631\u0633\u0627\u0644...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>\u062b\u0628\u062a \u0646\u0638\u0631</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Comments List */}
            <div className="bg-white rounded-xl border">
                {loading ? (
                    <div className="p-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="flex items-start gap-3 py-3 border-b last:border-b-0">
                                <div className="skeleton-shimmer w-8 h-8 !rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="skeleton-shimmer h-4 w-1/3"></div>
                                    <div className="skeleton-shimmer h-6 w-full"></div>
                                    <div className="skeleton-shimmer h-3 w-1/4"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="w-12 h-12 mx-auto text-text-secondary/50 mb-3" />
                        <p className="text-text-secondary font-medium">
                            \u0647\u0646\u0648\u0632 \u0646\u0638\u0631\u06cc \u062b\u0628\u062a \u0646\u0634\u062f\u0647 \u0627\u0633\u062a
                        </p>
                        {canWrite && (
                            <p className="text-xs text-text-secondary mt-1">
                                \u0627\u0648\u0644\u06cc\u0646 \u0646\u0638\u0631 \u0631\u0627 \u0634\u0645\u0627 \u0628\u0646\u0648\u06cc\u0633\u06cc\u062f
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="p-4">
                        {comments.map((comment, index) => (
                            <Comment key={comment.id || index} comment={comment} />
                        ))}
                    </div>
                )}
            </div>

            {!canWrite && comments.length > 0 && (
                <div className="text-center text-xs text-text-secondary bg-surface p-3 rounded-lg">
                    \u0634\u0645\u0627 \u0627\u062c\u0627\u0632\u0647 \u0627\u0641\u0632\u0648\u062f\u0646 \u0646\u0638\u0631 \u062f\u0631 \u0627\u06cc\u0646 \u0645\u0631\u062d\u0644\u0647 \u0631\u0627 \u0646\u062f\u0627\u0631\u06cc\u062f
                </div>
            )}
        </div>
    );
}