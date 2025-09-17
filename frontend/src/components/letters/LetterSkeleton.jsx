// src/components/letters/DetailSkeleton.jsx
import React from 'react';

export default function DetailSkeleton() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="skeleton-shimmer h-8 w-64 mb-3"></div>
                    <div className="flex items-center gap-3">
                        <div className="skeleton-shimmer h-6 w-20 !rounded-full"></div>
                        <div className="skeleton-shimmer h-4 w-16"></div>
                    </div>
                </div>
                <div className="skeleton-shimmer h-10 w-32 !rounded-lg"></div>
            </div>

            {/* Main Content Card */}
            <div className="card-modern !p-0 overflow-hidden">
                {/* Tab Navigation */}
                <div className="border-b-2 border-primary-100 flex items-center px-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-2 px-4 py-4">
                            <div className="skeleton-shimmer w-5 h-5 !rounded"></div>
                            <div className="skeleton-shimmer h-4 w-20"></div>
                        </div>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div className="skeleton-shimmer h-12 w-full !rounded-lg"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex gap-4">
                                <div className="skeleton-shimmer w-24 h-4"></div>
                                <div className="skeleton-shimmer flex-1 h-4"></div>
                            </div>
                        ))}
                    </div>
                    <div className="skeleton-shimmer h-32 w-full !rounded-lg"></div>
                </div>

                {/* Action Bar */}
                <div className="bg-surface border-t rounded-b-2xl p-4 flex justify-between">
                    <div className="flex gap-2">
                        <div className="skeleton-shimmer h-10 w-24 !rounded-lg"></div>
                        <div className="skeleton-shimmer h-10 w-20 !rounded-lg"></div>
                    </div>
                    <div className="skeleton-shimmer h-10 w-32 !rounded-lg"></div>
                </div>
            </div>
        </div>
    );
}