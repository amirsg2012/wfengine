// src/pages/Login.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, Eye, EyeOff, Loader2, BarChart2, FileText, Settings } from 'lucide-react';
import useAuth from '../api/useAuth';

// --- Reusable Input Field Sub-component ---
const InputField = ({ id, label, type, value, onChange, placeholder, icon: Icon }) => {
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && isPasswordVisible ? 'text' : type;

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor={id} style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                color: 'rgb(var(--color-text-primary))',
                marginBottom: '0.5rem'
            }}>
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <div style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgb(var(--color-text-secondary))'
                }}>
                    <Icon style={{ width: '1.25rem', height: '1.25rem' }} />
                </div>
                <input
                    id={id}
                    type={inputType}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    style={{
                        width: '100%',
                        padding: '0.875rem 3rem 0.875rem 1rem',
                        border: '2px solid rgb(var(--color-primary-200))',
                        borderRadius: 'var(--rounded-xl)',
                        fontSize: '1rem',
                        transition: 'all 0.2s',
                        background: 'rgb(var(--color-background))',
                        color: 'rgb(var(--color-text-primary))'
                    }}
                    onFocus={(e) => {
                        e.target.style.borderColor = 'rgb(var(--color-primary-500))';
                        e.target.style.boxShadow = '0 0 0 3px rgba(var(--color-primary-500), 0.1)';
                    }}
                    onBlur={(e) => {
                        e.target.style.borderColor = 'rgb(var(--color-primary-200))';
                        e.target.style.boxShadow = 'none';
                    }}
                />
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                        style={{
                            position: 'absolute',
                            left: '1rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'rgb(var(--color-text-secondary))',
                            cursor: 'pointer',
                            padding: '0.25rem'
                        }}
                        aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                    >
                        {isPasswordVisible ? 
                            <EyeOff style={{ width: '1.25rem', height: '1.25rem' }} /> : 
                            <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                        }
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Main Login Component ---
export default function Login() {
    const [username, setUsername] = useState('admin');
    const [password, setPassword] = useState('admin');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, token } = useAuth();
    const nav = useNavigate();

    // Handle redirect if already logged in
    useEffect(() => {
        if (token) {
            nav('/inbox', { replace: true });
        }
    }, [token, nav]);

    async function handle(e) {
        e.preventDefault();
        if (loading) return;

        setLoading(true);
        setError('');
        
        try {
            console.log('Starting login process...');
            const result = await login(username, password);
            
            if (result.success) {
                console.log('Login successful, navigating to dashboard...');
                // Let the useEffect handle navigation based on token state
                // Don't manually navigate here to avoid conflicts
            } else {
                setError(result.error || '\u0646\u0627\u0645 \u06a9\u0627\u0631\u0628\u0631\u06cc \u06cc\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0627\u0634\u062a\u0628\u0627\u0647 \u0627\u0633\u062a.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError(err?.message || '\u062e\u0637\u0627 \u062f\u0631 \u0628\u0631\u0642\u0631\u0627\u0631\u06cc \u0627\u0631\u062a\u0628\u0627\u0637 \u0628\u0627 \u0633\u0631\u0648\u0631');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'rgb(var(--color-background))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '1200px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '4rem',
                alignItems: 'center'
            }}>
                {/* Left Side - Login Form */}
                <div style={{
                    background: 'rgb(var(--color-surface))',
                    padding: '3rem',
                    borderRadius: 'var(--rounded-2xl)',
                    boxShadow: 'var(--shadow-xl)',
                    border: '2px solid rgb(var(--color-primary-100))'
                }}>
                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <h2 style={{
                            fontSize: '2rem',
                            fontWeight: '700',
                            color: 'rgb(var(--color-text-primary))',
                            marginBottom: '0.5rem'
                        }}>
                            \u0648\u0631\u0648\u062f \u0628\u0647 \u0633\u06cc\u0633\u062a\u0645
                        </h2>
                        <p style={{
                            color: 'rgb(var(--color-text-secondary))',
                            fontSize: '1rem'
                        }}>
                            \u0628\u0631\u0627\u06cc \u0627\u062f\u0627\u0645\u0647\u060c \u0648\u0627\u0631\u062f \u062d\u0633\u0627\u0628 \u06a9\u0627\u0631\u0628\u0631\u06cc \u062e\u0648\u062f \u0634\u0648\u06cc\u062f
                        </p>
                    </div>

                    <form onSubmit={handle} style={{ width: '100%' }}>
                        <InputField
                            id="username"
                            label="\u0646\u0627\u0645 \u06a9\u0627\u0631\u0628\u0631\u06cc"
                            type="text"
                            value={username}
                            onChange={setUsername}
                            placeholder="\u0646\u0627\u0645 \u06a9\u0627\u0631\u0628\u0631\u06cc \u062e\u0648\u062f \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f"
                            icon={User}
                        />

                        <InputField
                            id="password"
                            label="\u0631\u0645\u0632 \u0639\u0628\u0648\u0631"
                            type="password"
                            value={password}
                            onChange={setPassword}
                            placeholder="\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062e\u0648\u062f \u0631\u0627 \u0648\u0627\u0631\u062f \u06a9\u0646\u06cc\u062f"
                            icon={Lock}
                        />

                        {error && (
                            <div style={{
                                background: 'rgb(var(--color-error-50))',
                                border: '1px solid rgb(var(--color-error-200))',
                                color: 'rgb(var(--color-error-700))',
                                padding: '0.75rem',
                                borderRadius: 'var(--rounded-lg)',
                                fontSize: '0.875rem',
                                marginBottom: '1.5rem',
                                textAlign: 'center'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{
                                width: '100%',
                                background: loading ? 'rgb(var(--color-primary-300))' : 'rgb(var(--color-primary-500))',
                                color: 'white',
                                border: 'none',
                                padding: '1rem',
                                borderRadius: 'var(--rounded-xl)',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem'
                            }}
                            onMouseEnter={(e) => {
                                if (!loading) {
                                    e.target.style.background = 'rgb(var(--color-primary-600))';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!loading) {
                                    e.target.style.background = 'rgb(var(--color-primary-500))';
                                }
                            }}
                        >
                            {loading && <Loader2 style={{ width: '1rem', height: '1rem', animation: 'spin 1s linear infinite' }} />}
                            {loading ? '\u062f\u0631 \u062d\u0627\u0644 \u0648\u0631\u0648\u062f...' : '\u0648\u0631\u0648\u062f'}
                        </button>
                    </form>
                </div>

                {/* Right Side - Welcome Section */}
                <div style={{ padding: '2rem' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <div style={{
                            width: '5rem',
                            height: '5rem',
                            background: 'rgb(var(--color-primary-500))',
                            borderRadius: 'var(--rounded-2xl)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1.5rem',
                            boxShadow: 'var(--shadow-xl)'
                        }}>
                            <Shield style={{ width: '2.5rem', height: '2.5rem', color: 'white' }} />
                        </div>
                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '800',
                            color: 'rgb(var(--color-text-primary))',
                            marginBottom: '1rem'
                        }}>
                            \u0627\u062a\u0648\u0645\u0627\u0633\u06cc\u0648\u0646 \u0627\u062f\u0627\u0631\u06cc
                        </h1>
                        <p style={{
                            fontSize: '1.125rem',
                            color: 'rgb(var(--color-text-secondary))',
                            lineHeight: '1.6'
                        }}>
                            \u0633\u06cc\u0633\u062a\u0645 \u0645\u062f\u06cc\u0631\u06cc\u062a \u0627\u0633\u0646\u0627\u062f \u0648 \u0641\u0631\u0622\u06cc\u0646\u062f\u0647\u0627\u06cc \u0627\u062f\u0627\u0631\u06cc \u0628\u0627 \u0642\u0627\u0628\u0644\u06cc\u062a\u200c\u0647\u0627\u06cc \u067e\u06cc\u0634\u0631\u0641\u062a\u0647 \u0648 \u0627\u0645\u0646\u06cc\u062a \u0628\u0627\u0644\u0627
                        </p>
                    </div>

                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        {[
                            { icon: FileText, title: 'مدیریت اسناد', desc: '\u0633\u0627\u0632\u0645\u0627\u0646\u062f\u0647\u06cc \u0648 \u067e\u06cc\u06af\u06cc\u0631\u06cc \u0627\u0633\u0646\u0627\u062f \u0627\u062f\u0627\u0631\u06cc' },
                            { icon: BarChart2, title: '\u06af\u0632\u0627\u0631\u0634\u200c\u06af\u06cc\u0631\u06cc', desc: '\u062a\u0648\u0644\u06cc\u062f \u06af\u0632\u0627\u0631\u0634\u200c\u0647\u0627\u06cc \u062a\u0641\u0635\u06cc\u0644\u06cc \u0648 \u0622\u0645\u0627\u0631\u06cc' },
                            { icon: Settings, title: '\u062a\u0646\u0638\u06cc\u0645\u0627\u062a \u067e\u06cc\u0634\u0631\u0641\u062a\u0647', desc: '\u0634\u062e\u0635\u06cc\u200c\u0633\u0627\u0632\u06cc \u0633\u06cc\u0633\u062a\u0645 \u0628\u0631 \u0627\u0633\u0627\u0633 \u0646\u06cc\u0627\u0632' }
                        ].map((feature, index) => (
                            <div key={index} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '1rem',
                                background: 'rgb(var(--color-surface))',
                                borderRadius: 'var(--rounded-xl)',
                                border: '1px solid rgb(var(--color-primary-100))'
                            }}>
                                <div style={{
                                    width: '3rem',
                                    height: '3rem',
                                    background: 'rgb(var(--color-primary-100))',
                                    borderRadius: 'var(--rounded-lg)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <feature.icon style={{ width: '1.5rem', height: '1.5rem', color: 'rgb(var(--color-primary-600))' }} />
                                </div>
                                <div>
                                    <h3 style={{
                                        fontWeight: '600',
                                        color: 'rgb(var(--color-text-primary))',
                                        marginBottom: '0.25rem'
                                    }}>
                                        {feature.title}
                                    </h3>
                                    <p style={{
                                        fontSize: '0.875rem',
                                        color: 'rgb(var(--color-text-secondary))'
                                    }}>
                                        {feature.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}