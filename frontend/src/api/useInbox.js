// src/api/useInbox.js
import { useState, useEffect } from 'react'
import api from './client'

export default function useInbox() {
    const [inboxData, setInboxData] = useState([])
    const [stats, setStats] = useState({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadInbox = async () => {
        try {
            setLoading(true)
            
            // Load inbox workflows and stats in parallel
            const [inboxRes, statsRes] = await Promise.all([
                api.get('/workflows/inbox/'),
                api.get('/workflows/dashboard_stats/')
            ])
            
            setInboxData(inboxRes.data)
            setStats(statsRes.data)
            setError(null)
        } catch (err) {
            console.error('Failed to load inbox:', err)
            setError('خطا در بارگذاری صندوق ورودی')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadInbox()
    }, [])

    return {
        inboxData,
        stats, 
        loading,
        error,
        refresh: loadInbox
    }
}