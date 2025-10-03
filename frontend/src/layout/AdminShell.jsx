// src/layout/AdminShell.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Shield,
    Menu as MenuIcon,
    X,
    User,
    Settings,
    LogOut,
    Users,
    GitBranch,
    Activity,
    Key,
    Database,
    ChevronDown,
    Moon,
    Sun,
    Loader2,
    FileText,
    BarChart2,
    Bell
} from 'lucide-react';
import useAuth from '../api/useAuth';

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

export default function AdminShell() {
    const [navOpen, setNavOpen] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);
    const [isDarkMode, setIsDarkMode] = useTheme();

    const nav = useNavigate();
    const { pathname } = useLocation();
    const { token, me, loading: loadingMe, logout } = useAuth();

    const name = me?.first_name && me?.last_name
        ? `${me.first_name} ${me.last_name}`
        : me?.username || 'Admin';
    const email = me?.email || '';
    const avatar = name.charAt(0).toUpperCase();

    // Admin navigation items
    const adminNavigationItems = [
        { to: '/admin', icon: BarChart2, label: 'داشبورد مدیریت', exact: true },
        { to: '/admin/users', icon: Users, label: 'مدیریت کاربران' },
        { to: '/admin/permissions', icon: Key, label: 'مدیریت دسترسی‌ها' },
        { to: '/admin/workflow-template', icon: GitBranch, label: 'مدیریت گردش کار' },
        { to: '/admin/logs', icon: Activity, label: 'لاگ‌های سیستم' },
        { to: '/admin/settings', icon: Settings, label: 'تنظیمات سیستم' },
    ];

    // Quick access to user pages
    const userNavigationItems = [
        { to: '/inbox', icon: Bell, label: 'صندوق ورودی' },
        { to: '/workflows', icon: FileText, label: 'درخواست‌ها' },
    ];

    const handleLogout = React.useCallback(() => {
        try {
            logout();
            nav('/login', { replace: true });
        } catch (error) {
            console.error('Logout error:', error);
        }
    }, [logout, nav]);

    if (loadingMe) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-error-500 to-warning-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                    <p className="text-text-secondary font-medium">در حال بارگذاری پنل مدیریت...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Mobile Navigation Overlay */}
            {navOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setNavOpen(false)}
                    />
                    <div className="absolute top-0 right-0 h-full w-80 max-w-[85vw] bg-surface shadow-3d-2xl border-l-2 border-primary-200">
                        <div className="absolute top-4 left-4">
                            <button
                                onClick={() => setNavOpen(false)}
                                className="p-2 rounded-xl hover:bg-primary-50 transition-colors"
                            >
                                <X className="w-6 h-6 text-primary-600" />
                            </button>
                        </div>
                        <MobileSidebar
                            userName={name}
                            userEmail={email}
                            userAvatar={avatar}
                            adminNavigationItems={adminNavigationItems}
                            userNavigationItems={userNavigationItems}
                            pathname={pathname}
                            onLogout={() => setConfirmLogout(true)}
                            onNavClick={() => setNavOpen(false)}
                            isDarkMode={isDarkMode}
                            onThemeToggle={() => setIsDarkMode(!isDarkMode)}
                        />
                    </div>
                </div>
            )}

            {/* Desktop Layout */}
            <div className="hidden md:grid md:grid-cols-[280px_1fr] min-h-screen">
                {/* Desktop Sidebar */}
                <aside className="bg-surface border-l-2 border-primary-200 shadow-3d-xl">
                    <DesktopSidebar
                        userName={name}
                        userEmail={email}
                        userAvatar={avatar}
                        adminNavigationItems={adminNavigationItems}
                        userNavigationItems={userNavigationItems}
                        pathname={pathname}
                        onLogout={() => setConfirmLogout(true)}
                        isDarkMode={isDarkMode}
                        onThemeToggle={() => setIsDarkMode(!isDarkMode)}
                    />
                </aside>

                {/* Desktop Main Content */}
                <main className="p-6 overflow-auto">
                    <div className="bg-surface shadow-3d-xl border-2 border-primary-200 rounded-2xl p-6 min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden min-h-screen flex flex-col">
                {/* Mobile Header */}
                <header className="bg-surface border-b-2 border-primary-200 shadow-3d-lg flex items-center justify-between px-4 h-16 flex-shrink-0">
                    <button
                        onClick={() => setNavOpen(true)}
                        className="p-3 rounded-xl hover:bg-primary-50 transition-colors shadow-3d-sm"
                    >
                        <MenuIcon className="w-6 h-6 text-primary-600" />
                    </button>

                    <div className="flex items-center gap-3 font-bold">
                        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center text-white shadow-3d-md">
                            <Shield className="w-6 h-6" />
                        </div>
                        <span className="text-text-primary text-lg">پنل مدیریت</span>
                    </div>

                    <button
                        onClick={() => nav('/profile')}
                        className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold hover:bg-primary-600 transition-colors shadow-3d-md"
                    >
                        <span className="text-lg">{avatar}</span>
                    </button>
                </header>

                {/* Mobile Main Content */}
                <main className="flex-1 p-4 pt-6 overflow-auto">
                    <div className="bg-surface shadow-3d-xl border-2 border-primary-200 rounded-2xl p-4 min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Logout Confirmation Modal */}
            {confirmLogout && (
                <LogoutModal
                    onConfirm={() => {
                        handleLogout();
                        setConfirmLogout(false);
                    }}
                    onCancel={() => setConfirmLogout(false)}
                />
            )}
        </div>
    );
}

// Desktop Sidebar Component
function DesktopSidebar({
    userName, userEmail, userAvatar, adminNavigationItems, userNavigationItems,
    pathname, onLogout, isDarkMode, onThemeToggle
}) {
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b-2 border-primary-200 flex-shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg">
                        <Shield className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-xl text-text-primary">پنل مدیریت</h2>
                        <p className="text-sm text-text-secondary font-medium">مدیریت سیستم</p>
                    </div>
                </div>
            </div>

            {/* User Profile Section */}
            <div className="p-6 flex-shrink-0" ref={menuRef}>
                <AdminUserProfileMenu
                    userName={userName}
                    userEmail={userEmail}
                    userAvatar={userAvatar}
                    isOpen={userMenuOpen}
                    onToggle={() => setUserMenuOpen(!userMenuOpen)}
                    onLogout={onLogout}
                    isDarkMode={isDarkMode}
                    onThemeToggle={onThemeToggle}
                />
            </div>

            {/* Admin Navigation */}
            <nav className="flex-1 p-6 overflow-auto space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 px-3">
                        مدیریت سیستم
                    </h3>
                    {adminNavigationItems.map((item) => (
                        <AdminNavigationItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            exact={item.exact}
                            isActive={item.exact ? pathname === item.to : pathname.startsWith(item.to)}
                        />
                    ))}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3 px-3">
                        دسترسی سریع
                    </h3>
                    {userNavigationItems.map((item) => (
                        <AdminNavigationItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            isActive={pathname === item.to}
                        />
                    ))}
                </div>
            </nav>

            {/* Footer */}
            <div className="p-6 border-t-2 border-primary-200 flex-shrink-0">
                <p className="text-xs text-text-secondary text-center">
                    سیستم مدیریت اتوماسیون v1.0
                </p>
            </div>
        </div>
    );
}

// Mobile Sidebar Component
function MobileSidebar({
    userName, userEmail, userAvatar, adminNavigationItems, userNavigationItems,
    pathname, onLogout, onNavClick, isDarkMode, onThemeToggle
}) {
    return (
        <div className="flex flex-col h-full pt-16">
            {/* User Profile */}
            <div className="p-6 border-b-2 border-primary-200 flex-shrink-0">
                <div className="flex items-center gap-4 p-4 bg-primary-50 rounded-xl border border-primary-200">
                    <div className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-3d-lg">
                        {userAvatar}
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-text-primary text-base">{userName}</div>
                        <div className="text-sm text-text-secondary font-medium">{userEmail}</div>
                        <div className="text-xs text-primary-600 font-bold mt-1">مدیر سیستم</div>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-6 overflow-auto space-y-6">
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                        مدیریت سیستم
                    </h3>
                    {adminNavigationItems.map((item) => (
                        <AdminNavigationItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            exact={item.exact}
                            isActive={item.exact ? pathname === item.to : pathname.startsWith(item.to)}
                            onClick={onNavClick}
                            mobile
                        />
                    ))}
                </div>

                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                        دسترسی سریع
                    </h3>
                    {userNavigationItems.map((item) => (
                        <AdminNavigationItem
                            key={item.to}
                            to={item.to}
                            icon={item.icon}
                            label={item.label}
                            isActive={pathname === item.to}
                            onClick={onNavClick}
                            mobile
                        />
                    ))}
                </div>
            </nav>

            {/* Mobile Actions */}
            <div className="p-6 border-t-2 border-primary-200 space-y-3 flex-shrink-0">
                <button
                    onClick={onThemeToggle}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-primary-50 rounded-xl transition-colors"
                >
                    {isDarkMode ? <Sun className="w-5 h-5 text-warning-500" /> : <Moon className="w-5 h-5 text-primary-500" />}
                    <span>{isDarkMode ? 'حالت روشن' : 'حالت تاریک'}</span>
                </button>
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-error-600 hover:bg-error-50 rounded-xl transition-colors"
                >
                    <LogOut className="w-5 h-5 text-error-500" />
                    <span>خروج</span>
                </button>
            </div>
        </div>
    );
}

// Admin User Profile Menu Component
function AdminUserProfileMenu({
    userName, userEmail, userAvatar, isOpen, onToggle,
    onLogout, isDarkMode, onThemeToggle
}) {
    return (
        <>
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-4 hover:bg-primary-50 rounded-xl transition-colors group border-2 border-transparent hover:border-primary-200"
            >
                <div className="w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-3d-lg group-hover:scale-105 transition-transform">
                    {userAvatar}
                </div>
                <div className="flex-1 text-right">
                    <div className="font-bold text-text-primary text-base">{userName}</div>
                    <div className="text-sm text-text-secondary font-medium">{userEmail}</div>
                </div>
                <ChevronDown
                    className={`w-6 h-6 text-primary-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="mt-3 bg-surface border-2 border-primary-200 rounded-xl shadow-3d-xl overflow-hidden">
                    <button
                        onClick={onThemeToggle}
                        className="w-full flex items-center gap-4 px-5 py-4 text-sm font-medium text-text-primary hover:bg-primary-50 transition-colors border-b border-primary-100"
                    >
                        {isDarkMode ? <Sun className="w-5 h-5 text-warning-500" /> : <Moon className="w-5 h-5 text-primary-500" />}
                        <span>{isDarkMode ? 'حالت روشن' : 'حالت تاریک'}</span>
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-4 px-5 py-4 text-sm font-medium text-error-600 hover:bg-error-50 hover:text-error-700 transition-colors"
                    >
                        <LogOut className="w-5 h-5 text-error-500" />
                        <span>خروج</span>
                    </button>
                </div>
            )}
        </>
    );
}

// Admin Navigation Item Component
function AdminNavigationItem({ to, icon: Icon, label, exact, isActive, onClick, mobile }) {
    const handleClick = () => {
        if (onClick) onClick();
    };

    const baseClasses = "flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-200 font-medium border-2";
    const activeClasses = "bg-primary-500 text-white font-bold shadow-3d-lg border-primary-600";
    const inactiveClasses = "hover:bg-primary-50 text-text-secondary hover:text-text-primary border-transparent hover:border-primary-200";

    return (
        <NavLink
            to={to}
            end={exact}
            onClick={handleClick}
            className={({ isActive: navIsActive }) =>
                `${baseClasses} ${(navIsActive || isActive) ? activeClasses : inactiveClasses}`
            }
        >
            {({ isActive: navIsActive }) => (
                <>
                    <Icon className={`w-6 h-6 ${(navIsActive || isActive) ? 'text-white' : 'text-primary-500'}`} />
                    <span className="flex-1">{label}</span>
                </>
            )}
        </NavLink>
    );
}

// Logout Modal Component
function LogoutModal({ onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onCancel}
            />
            <div className="relative bg-surface rounded-2xl shadow-3d-2xl p-8 w-full max-w-sm text-center border-2 border-primary-200">
                <h3 className="text-xl font-bold text-text-primary mb-3">تأیید خروج</h3>
                <p className="text-base text-text-secondary mb-8 font-medium">آیا از خروج از پنل مدیریت اطمینان دارید؟</p>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-primary-50 rounded-xl transition-colors border-2 border-primary-200"
                    >
                        انصراف
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-3 text-sm font-medium bg-error-500 hover:bg-error-600 text-white rounded-xl transition-colors shadow-3d-md"
                    >
                        تأیید
                    </button>
                </div>
            </div>
        </div>
    );
}
