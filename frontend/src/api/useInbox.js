// src/api/useInbox.js
import { useState, useEffect } from 'react';
import api from './client';

export default function useInbox() {
    const [inboxData, setInboxData] = useState([]);
    const [stats, setStats] = useState({
        pending_my_action: 0,
        total_letters: 0,
        completed_today: 0,
        avg_processing_time: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchInboxData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch letters for inbox (pending user action)
            const inboxResponse = await api.get('/workflows/', {
                params: {
                    can_approve: true,
                    limit: 10,
                    offset: 0
                }
            });

            // Fetch stats
            const statsResponse = await api.get('/workflows/stats/');

            setInboxData(inboxResponse.data.results || []);
            setStats(statsResponse.data || stats);
        } catch (err) {
            console.error('Error fetching inbox data:', err);
            setError(err.response?.data?.detail || 'خطا در دریافت اطلاعات');
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        fetchInboxData();
    };

    const approveWorkflow = async (letterId) => {
        try {
            await api.post(`/workflows/${letterId}/approve/`);
            // Refresh data after approval
            await fetchInboxData();
            return { success: true };
        } catch (err) {
            console.error('Error approving workflow:', err);
            return { 
                success: false, 
                error: err.response?.data?.detail || 'خطا در تایید درخواست' 
            };
        }
    };

    useEffect(() => {
        fetchInboxData();
    }, []);

    return {
        inboxData,
        stats,
        loading,
        error,
        refresh,
        approveWorkflow
    };
}