// src/components/dashboard/StatWidget.jsx
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatWidget({ 
    title, 
    value, 
    change, 
    type = 'primary', 
    trend = 'up',
    icon: Icon 
}) {
    const typeStyles = {
        primary: {
            bg: 'bg-primary-50',
            iconBg: 'bg-primary-100',
            iconColor: 'text-primary-600',
            valueColor: 'text-primary-700'
        },
        success: {
            bg: 'bg-success-50',
            iconBg: 'bg-success-100',
            iconColor: 'text-success-600',
            valueColor: 'text-success-700'
        },
        warning: {
            bg: 'bg-warning-50',
            iconBg: 'bg-warning-100',
            iconColor: 'text-warning-600',
            valueColor: 'text-warning-700'
        },
        error: {
            bg: 'bg-error-50',
            iconBg: 'bg-error-100',
            iconColor: 'text-error-600',
            valueColor: 'text-error-700'
        }
    };

    const styles = typeStyles[type] || typeStyles.primary;

    return (
        <div className={`card-modern p-6 ${styles.bg} border border-${type}-200`}>
            <div className="flex items-center justify-between mb-4">
                {Icon && (
                    <div className={`w-12 h-12 ${styles.iconBg} rounded-xl flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${styles.iconColor}`} />
                    </div>
                )}
                
                {change && (
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                        trend === 'up' ? 'text-success-600' : 'text-error-600'
                    }`}>
                        {trend === 'up' ? 
                            <TrendingUp className="w-4 h-4" /> : 
                            <TrendingDown className="w-4 h-4" />
                        }
                        <span>{change}</span>
                    </div>
                )}
            </div>
            
            <div>
                <h3 className={`text-3xl font-bold mb-1 ${styles.valueColor}`}>
                    {typeof value === 'number' ? value.toLocaleString('fa-IR') : value}
                </h3>
                <p className="text-sm text-text-secondary font-medium">{title}</p>
            </div>
        </div>
    );
}