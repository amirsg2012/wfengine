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
            const inboxResponse = await api.get('/letters/', {
                params: {
                    can_approve: true,
                    limit: 10,
                    offset: 0
                }
            });

            // Fetch stats
            const statsResponse = await api.get('/letters/stats/');

            setInboxData(inboxResponse.data.results || []);
            setStats(statsResponse.data || stats);
        } catch (err) {
            console.error('Error fetching inbox data:', err);
            setError(err.response?.data?.detail || '\u062e\u0637\u0627 \u062f\u0631 \u062f\u0631\u06cc\u0627\u0641\u062a \u0627\u0637\u0644\u0627\u0639\u0627\u062a');
        } finally {
            setLoading(false);
        }
    };

    const refresh = () => {
        fetchInboxData();
    };

    const approveWorkflow = async (letterId) => {
        try {
            await api.post(`/letters/${letterId}/approve/`);
            // Refresh data after approval
            await fetchInboxData();
            return { success: true };
        } catch (err) {
            console.error('Error approving workflow:', err);
            return { 
                success: false, 
                error: err.response?.data?.detail || '\u062e\u0637\u0627 \u062f\u0631 \u062a\u0627\u06cc\u06cc\u062f \u062f\u0631\u062e\u0648\u0627\u0633\u062a' 
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