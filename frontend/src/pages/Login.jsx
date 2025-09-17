// src/pages/Login.jsx
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
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
            <label 
                htmlFor={id} 
                style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: '700', 
                    fontSize: '0.875rem', 
                    color: 'rgb(var(--color-text-secondary))',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em'
                }}
            >
                {label}
            </label>
            <div style={{ position: 'relative' }}>
                <span style={{ 
                    position: 'absolute', 
                    right: '1rem', 
                    top: '50%', 
                    transform: 'translateY(-50%)', 
                    color: 'rgb(var(--color-text-secondary))' 
                }}>
                    <Icon style={{ width: '1.25rem', height: '1.25rem' }} />
                </span>
                <input
                    id={id}
                    type={inputType}
                    value={value}
                    dir="ltr"
                    onChange={onChange}
                    placeholder={placeholder}
                    required
                    className="input-modern"
                    style={{ 
                        paddingRight: '3rem',
                        fontSize: '1rem',
                        fontWeight: '500'
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
                            transition: 'color 250ms ease'
                        }}
                        onMouseEnter={(e) => e.target.style.color = 'rgb(var(--color-text-primary))'}
                        onMouseLeave={(e) => e.target.style.color = 'rgb(var(--color-text-secondary))'}
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
            // Simulate network delay for better UX
            await new Promise(resolve => setTimeout(resolve, 1000));
            await login(username, password);
            console.log('Login response received');
            // nav('/inbox');
        } catch (err) {
            setError(err?.message || 'نام کاربری یا رمز عبور اشتباه است.');
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
                            ورود به سامانه
                        </h2>
                        <p style={{
                            color: 'rgb(var(--color-text-secondary))',
                            fontSize: '1.125rem',
                            fontWeight: '500'
                        }}>
                            اطلاعات کاربری خود را وارد کنید
                        </p>
                    </div>

                    <form onSubmit={handle} style={{ marginTop: '2rem' }}>
                        <InputField
                            id="username"
                            label="نام کاربری"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="admin"
                            icon={User}
                        />

                        <InputField
                            id="password"
                            label="رمز عبور"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            icon={Lock}
                        />

                        {error && (
                            <div style={{
                                background: 'rgb(var(--color-error-50))',
                                color: 'rgb(var(--color-error-600))',
                                padding: '0.75rem 1rem',
                                borderRadius: 'var(--rounded-xl)',
                                fontSize: '0.875rem',
                                fontWeight: '600',
                                marginBottom: '1.5rem',
                                border: '2px solid rgb(var(--color-error-200))'
                            }}>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                fontSize: '1.125rem',
                                fontWeight: '700',
                                padding: '1rem 2rem',
                                opacity: loading ? 0.75 : 1,
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? (
                                <Loader2 style={{ width: '1.25rem', height: '1.25rem', animation: 'spin 1s linear infinite' }} />
                            ) : (
                                <Shield style={{ width: '1.25rem', height: '1.25rem' }} />
                            )}
                            <span>{loading ? 'در حال ورود...' : 'ورود به سامانه'}</span>
                        </button>

                        <p style={{
                            textAlign: 'center',
                            marginTop: '1.5rem',
                            fontSize: '0.875rem',
                            color: 'rgb(var(--color-text-secondary))',
                            fontWeight: '500'
                        }}>
                            در صورت بروز مشکل با واحد پشتیبانی تماس بگیرید
                        </p>
                    </form>
                </div>

                {/* Right Side - Branding */}
                <div style={{
                    background: 'rgb(var(--color-primary-500))',
                    color: 'white',
                    padding: '3rem',
                    borderRadius: 'var(--rounded-2xl)',
                    boxShadow: 'var(--shadow-red)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    {/* Background decoration */}
                    <div style={{
                        position: 'absolute',
                        top: '-2rem',
                        right: '-2rem',
                        width: '8rem',
                        height: '8rem',
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '50%'
                    }}></div>
                    
                    <div style={{ position: 'relative', zIndex: 10 }}>
                        <div style={{
                            width: '4rem',
                            height: '4rem',
                            background: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 'var(--rounded-2xl)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: '2rem'
                        }}>
                            <Shield style={{ width: '2rem', height: '2rem', color: 'white' }} />
                        </div>

                        <h1 style={{
                            fontSize: '2.5rem',
                            fontWeight: '700',
                            marginBottom: '1rem',
                            lineHeight: '1.2'
                        }}>
                            سامانه اتوماسیون اداری
                        </h1>

                        <p style={{
                            fontSize: '1.125rem',
                            marginBottom: '2rem',
                            opacity: 0.9,
                            fontWeight: '500',
                            lineHeight: '1.6'
                        }}>
                            مدیریت هوشمند درخواست‌ها و فرآیندهای اداری شما
                        </p>

                        {/* Feature badges */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: '1rem',
                            marginTop: '2rem'
                        }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                padding: '1rem',
                                borderRadius: 'var(--rounded-xl)',
                                textAlign: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <FileText style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem' }} />
                                <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>مدیریت سیستم</div>
                            </div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                padding: '1rem',
                                borderRadius: 'var(--rounded-xl)',
                                textAlign: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <BarChart2 style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem' }} />
                                <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>گزارش‌های تحلیلی</div>
                            </div>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.15)',
                                padding: '1rem',
                                borderRadius: 'var(--rounded-xl)',
                                textAlign: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}>
                                <Settings style={{ width: '1.5rem', height: '1.5rem', margin: '0 auto 0.5rem' }} />
                                <div style={{ fontSize: '0.75rem', fontWeight: '600' }}>داشبورد تحلیلی</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile responsive styles */}
            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                    
                    @media (max-width: 768px) {
                        .login-container {
                            grid-template-columns: 1fr !important;
                            gap: 2rem !important;
                        }
                        
                        .login-form, .login-branding {
                            padding: 2rem !important;
                        }
                        
                        .login-title {
                            font-size: 1.75rem !important;
                        }
                        
                        .branding-title {
                            font-size: 2rem !important;
                        }
                    }
                `}
            </style>
        </div>
    );
}