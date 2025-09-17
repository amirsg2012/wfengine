// src/layout/Shell.jsx - WORKING VERSION
import React, { useState, useRef, useEffect, Fragment } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Shield,
    Menu as MenuIcon,
    X,
    User,
    Settings,
    LogOut,
    Inbox,
    FileText,
    BarChart2,
    Archive,
    HelpCircle,
    ChevronDown,
    Moon,
    Sun, 
    Loader2
} from 'lucide-react';
import { Transition } from '@headlessui/react';
import useAuth from '../api/useAuth'; // Use direct import, not useAuthSafe

// Theme Hook
function useTheme() {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('theme') === 'dark';
        }
        return false;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        if (isDarkMode) {
            root.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    }, [isDarkMode]);

    return [isDarkMode, setIsDarkMode];
}

export default function Shell() {
    // State
    const [navOpen, setNavOpen] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [isDarkMode, setIsDarkMode] = useTheme();
    
    // Hooks
    const nav = useNavigate();
    const { pathname } = useLocation();
    
    // Direct auth hook usage - no safe wrapper
    const { token, me, loading: loadingMe, logout } = useAuth();

    // Derived data
    const name = me?.first_name && me?.last_name ? 
        `${me.first_name} ${me.last_name}` : me?.username || '\u06a9\u0627\u0631\u0628\u0631';
    const email = me?.email || '';
    const avatar = name.charAt(0).toUpperCase();

    // Handlers
    const handleLogout = () => {
        logout();
        nav('/login', { replace: true });
    };

    const navigationItems = [
        { to: '/inbox', icon: Inbox, label: '\u0635\u0646\u062f\u0648\u0642 \u0648\u0631\u0648\u062f\u06cc', badge: 3 },
        { to: '/letters', icon: FileText, label: '\u062f\u0631\u062e\u0648\u0627\u0633\u062a\u200c\u0647\u0627' },
        { to: '/reports', icon: BarChart2, label: '\u06af\u0632\u0627\u0631\u0634\u200c\u0647\u0627' },
        { to: '/archive', icon: Archive, label: '\u0628\u0627\u06cc\u06af\u0627\u0646\u06cc' },
    ];

    return (
        <>
            {/* Mobile Navigation Overlay */}
            {navOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
                        onClick={() => setNavOpen(false)}
                    />
                    
                    {/* Sidebar */}
                    <div className="absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-surface shadow-2xl">
                        {/* Close button */}
                        <div className="absolute top-4 left-4">
                            <button 
                                onClick={() => setNavOpen(false)}
                                className="btn-ghost !p-2"
                            >
                                <X className="w-6 h-6 text-primary-600" />
                            </button>
                        </div>
                        
                        <SidebarContent 
                            name={name}
                            email={email}
                            avatar={avatar}
                            loading={loadingMe}
                            onLogout={() => setConfirmLogout(true)}
                            isDarkMode={isDarkMode}
                            setIsDarkMode={setIsDarkMode}
                            navigationItems={navigationItems}
                            pathname={pathname}
                            closeNav={() => setNavOpen(false)}
                        />
                    </div>
                </div>
            )}

            {/* Main Layout Container */}
            <div className="min-h-screen bg-background">
                {/* Desktop Layout Grid */}
                <div className="hidden md:grid md:grid-cols-[280px_1fr]">
                    {/* Desktop Sidebar */}
                    <aside className="bg-surface border-l-2 border-primary-200 shadow-xl">
                        <SidebarContent 
                            name={name}
                            email={email}
                            avatar={avatar}
                            loading={loadingMe}
                            onLogout={() => setConfirmLogout(true)}
                            isDarkMode={isDarkMode}
                            setIsDarkMode={setIsDarkMode}
                            navigationItems={navigationItems}
                            pathname={pathname}
                        />
                    </aside>

                    {/* Desktop Main Content */}
                    <main className="p-6">
                        <div className="bg-surface shadow-xl border-2 border-primary-200 rounded-2xl p-6">
                            <Outlet />
                        </div>
                    </main>
                </div>

                {/* Mobile Layout */}
                <div className="md:hidden">
                    {/* Mobile Header */}
                    <header className="bg-surface border-b-2 border-primary-200 shadow-lg flex items-center justify-between px-4 h-16">
                        <button 
                            onClick={() => setNavOpen(true)}
                            className="btn-ghost !p-3"
                        >
                            <MenuIcon className="w-6 h-6 text-primary-600" />
                        </button>
                        
                        <div className="flex items-center gap-3 font-bold">
                            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-red">
                                <Shield className="w-6 h-6" />
                            </div>
                            <span className="text-text-primary text-lg">\u0627\u062a\u0648\u0645\u0627\u0633\u06cc\u0648\u0646</span>
                        </div>
                        
                        <div 
                            className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer shadow-red hover:bg-primary-600 transition-all duration-200" 
                            onClick={() => nav('/profile')}
                        >
                            {loadingMe ? 
                                <Loader2 className="w-5 h-5 animate-spin"/> : 
                                <span className="text-lg">{avatar}</span>
                            }
                        </div>
                    </header>

                    {/* Mobile Main Content */}
                    <main className="p-4 pt-6">
                        <div className="bg-surface shadow-xl border-2 border-primary-200 rounded-2xl p-4">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </div>

            {/* Logout Confirmation Modal */}
            {confirmLogout && (
                <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
                    <div 
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm" 
                        onClick={() => setConfirmLogout(false)} 
                    />
                    <div className="relative bg-surface rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center border-2 border-primary-200">
                        <h3 className="text-xl font-bold text-text-primary mb-3">\u062a\u0623\u06cc\u06cc\u062f \u062e\u0631\u0648\u062c</h3>
                        <p className="text-base text-text-secondary mb-8 font-medium">\u0622\u06cc\u0627 \u0627\u0632 \u062e\u0631\u0648\u062c \u0627\u0632 \u0633\u06cc\u0633\u062a\u0645 \u0627\u0637\u0645\u06cc\u0646\u0627\u0646 \u062f\u0627\u0631\u06cc\u062f\u061f</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button 
                                onClick={() => setConfirmLogout(false)} 
                                className="btn-ghost !py-3"
                            >
                                \u0627\u0646\u0635\u0631\u0627\u0641
                            </button>
                            <button 
                                onClick={() => { handleLogout(); setConfirmLogout(false); }} 
                                className="btn-primary !bg-error-500 hover:!bg-error-600 !py-3"
                            >
                                \u062a\u0623\u06cc\u06cc\u062f
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Sidebar Content Component
function SidebarContent({ name, email, avatar, loading, onLogout, isDarkMode, setIsDarkMode, navigationItems, pathname, closeNav }) {
    return (
        <div className="flex flex-col bg-surface text-text-primary h-screen">
            {/* Header */}
            <div className="p-6 border-b-2 border-primary-200">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-red">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-xl text-text-primary">\u0627\u062a\u0648\u0645\u0627\u0633\u06cc\u0648\u0646</h2>
                        <p className="text-sm text-text-secondary font-medium">\u0633\u06cc\u0633\u062a\u0645 \u0645\u062f\u06cc\u0631\u06cc\u062a \u0627\u0633\u0646\u0627\u062f</p>
                    </div>
                </div>
            </div>

            {/* User Profile */}
            <UserProfile
                name={name}
                email={email}
                avatar={avatar}
                loading={loading}
                onLogout={onLogout}
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
            />

            {/* Navigation */}
            <nav className="flex-1 p-6 space-y-3">
                <div className="mb-6">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 px-3">
                        \u0645\u0646\u0648\u06cc \u0627\u0635\u0644\u06cc
                    </h3>
                    {navigationItems.map((item) => (
                        <SideNavItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            badge={item.badge}
                            active={pathname === item.to}
                            closeNav={closeNav}
                        />
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t-2 border-primary-200">
                <button 
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-primary-50 rounded-xl transition-all duration-200 border-2 border-transparent hover:border-primary-200"
                    style={{ cursor: 'pointer' }}
                >
                    <HelpCircle className="w-5 h-5 text-primary-500" />
                    <span>\u0631\u0627\u0647\u0646\u0645\u0627 \u0648 \u067e\u0634\u062a\u06cc\u0628\u0627\u0646\u06cc</span>
                </button>
            </div>
        </div>
    );
}

// User Profile Component
function UserProfile({ name, email, avatar, loading, onLogout, isDarkMode, setIsDarkMode }) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const nav = useNavigate();

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const menuItems = [
        { label: '\u067e\u0631\u0648\u0641\u0627\u06cc\u0644 \u06a9\u0627\u0631\u0628\u0631\u06cc', icon: User, action: () => nav('/profile') },
        { label: '\u062a\u0646\u0638\u06cc\u0645\u0627\u062a', icon: Settings, action: () => nav('/settings') },
        { label: '\u062e\u0631\u0648\u062c', icon: LogOut, action: onLogout, isDanger: true },
    ];

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center gap-3 p-3">
                    <div className="w-14 h-14 bg-primary-100 animate-pulse rounded-full"></div>
                    <div className="flex-1">
                        <div className="h-4 bg-primary-100 animate-pulse rounded mb-1"></div>
                        <div className="h-3 bg-primary-50 animate-pulse rounded w-2/3"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-4 p-4 hover:bg-primary-50 rounded-xl transition-all duration-200 group border-2 border-transparent hover:border-primary-200"
                style={{ cursor: 'pointer' }}
            >
                <div className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-red group-hover:shadow-red-lg group-hover:scale-105 transition-all duration-200">
                    {avatar}
                </div>
                <div className="flex-1 text-right">
                    <div className="font-bold text-text-primary text-base">{name}</div>
                    <div className="text-sm text-text-secondary font-medium">{email}</div>
                </div>
                <ChevronDown 
                    className={`w-6 h-6 text-primary-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
                />
            </button>

            {isOpen && (
                <ul className="mt-3 bg-surface border-2 border-primary-200 rounded-xl shadow-xl overflow-hidden">
                    {menuItems.map((item, index) => (
                        <li key={index}>
                            <button
                                onClick={() => {
                                    item.action();
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 px-5 py-4 text-sm font-medium hover:bg-primary-50 transition-colors border-b border-primary-100 last:border-b-0 ${
                                    item.isDanger ? 'text-error-600 hover:bg-error-50 hover:text-error-700' : 'text-text-primary'
                                }`}
                                style={{ cursor: 'pointer' }}
                            >
                                <item.icon className={`w-5 h-5 ${item.isDanger ? 'text-error-500' : 'text-primary-500'}`} />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                    <li>
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="w-full flex items-center gap-4 px-5 py-4 text-sm font-medium text-text-primary hover:bg-primary-50 transition-colors"
                            style={{ cursor: 'pointer' }}
                        >
                            {isDarkMode ? 
                                <Sun className="w-5 h-5 text-warning-500" /> : 
                                <Moon className="w-5 h-5 text-primary-500" />
                            }
                            <span>{isDarkMode ? '\u062d\u0627\u0644\u062a \u0631\u0648\u0634\u0646' : '\u062d\u0627\u0644\u062a \u062a\u0627\u0631\u06cc\u06a9'}</span>
                        </button>
                    </li>
                </ul>
            )}
        </div>
    );
}

// Navigation Item Component
function SideNavItem({ to, icon: Icon, label, badge, active, closeNav }) {
    const handleClick = () => {
        if (closeNav) closeNav(); // Close mobile nav when item is clicked
    };

    return (
        <NavLink
            to={to}
            onClick={handleClick}
            className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 relative font-medium border-2 ${
                    isActive 
                        ? 'bg-primary-500 text-white font-bold shadow-red border-primary-600' 
                        : 'hover:bg-primary-50 text-text-secondary hover:text-text-primary border-transparent hover:border-primary-200'
                }`
            }
            style={{ cursor: 'pointer' }}
        >
            {({ isActive }) => (
                <>
                    <Icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-primary-500'}`} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                        <div className={`text-xs font-bold px-3 py-1 rounded-xl shadow-sm ${
                            isActive 
                                ? 'bg-white text-primary-500' 
                                : 'bg-error-500 text-white'
                        }`}>
                            {badge}
                        </div>
                    )}
                </>
            )}
        </NavLink>
    );
}