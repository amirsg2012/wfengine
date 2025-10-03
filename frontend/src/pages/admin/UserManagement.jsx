// src/pages/admin/UserManagement.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    Plus,
    Search,
    Edit,
    Trash2,
    Shield,
    Eye,
    EyeOff,
    Save,
    X,
    Check,
    AlertCircle,
    UserCheck,
    UserX
} from 'lucide-react';
import api from '../../api/client';

const UserCard = ({ user, onEdit, onDelete, onToggleStatus }) => (
    <div className="card-modern p-6 hover:shadow-3d-lg transition-all duration-200">
        <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border-2 ${
                    user.is_active ? 'bg-success-50 border-success-200' : 'bg-error-50 border-error-200'
                }`}>
                    <span className="text-lg font-bold text-text-primary">
                        {user.first_name?.[0] || user.username[0].toUpperCase()}
                    </span>
                </div>

                <div>
                    <h4 className="font-semibold text-text-primary">
                        {user.first_name && user.last_name ?
                            `${user.first_name} ${user.last_name}` :
                            user.username
                        }
                    </h4>
                    <p className="text-sm text-text-secondary">{user.email || 'ایمیل تنظیم نشده'}</p>
                    <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                            user.is_active ?
                            'bg-success-100 text-success-700' :
                            'bg-error-100 text-error-700'
                        }`}>
                            {user.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                        {user.is_superuser && (
                            <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-700">
                                مدیر کل
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={() => onToggleStatus(user)}
                    className={`btn-ghost !p-2 ${user.is_active ? 'text-error-600' : 'text-success-600'}`}
                    title={user.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                >
                    {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                </button>
                <button
                    onClick={() => onEdit(user)}
                    className="btn-ghost !p-2 text-primary-600"
                    title="ویرایش"
                >
                    <Edit className="w-4 h-4" />
                </button>
                <button
                    onClick={() => onDelete(user)}
                    className="btn-ghost !p-2 text-error-600"
                    title="حذف"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>

        {/* User Roles */}
        {user.roles && user.roles.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary-100">
                <p className="text-xs text-text-secondary mb-2">نقش‌ها:</p>
                <div className="flex flex-wrap gap-2">
                    {user.roles.map((role, index) => (
                        <span key={index} className="text-xs px-2 py-1 bg-primary-50 text-primary-700 rounded border border-primary-200">
                            {role.name_fa}
                        </span>
                    ))}
                </div>
            </div>
        )}
    </div>
);

const UserModal = ({ user, roles, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        username: user?.username || '',
        first_name: user?.first_name || '',
        last_name: user?.last_name || '',
        email: user?.email || '',
        password: '',
        is_active: user?.is_active ?? true,
        is_superuser: user?.is_superuser || false,
        selected_roles: user?.role_codes || []
    });
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        try {
            await onSave(formData);
        } catch (error) {
            setErrors(error.response?.data || { general: 'خطا در ذخیره اطلاعات' });
        } finally {
            setLoading(false);
        }
    };

    const handleRoleToggle = (roleCode) => {
        setFormData(prev => ({
            ...prev,
            selected_roles: prev.selected_roles.includes(roleCode)
                ? prev.selected_roles.filter(r => r !== roleCode)
                : [...prev.selected_roles, roleCode]
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>

            <div className="relative bg-surface rounded-2xl shadow-3d-xl border-2 border-primary-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-primary-200">
                    <h3 className="text-xl font-bold text-text-primary">
                        {user ? 'ویرایش کاربر' : 'افزودن کاربر جدید'}
                    </h3>
                    <button onClick={onClose} className="btn-ghost !p-2">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {errors.general && (
                        <div className="bg-error-50 border border-error-200 rounded-lg p-4 flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 text-error-600" />
                            <span className="text-sm text-error-700">{errors.general}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                نام کاربری <span className="text-error-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                                className="input-modern"
                                placeholder="نام کاربری را وارد کنید"
                                required
                            />
                            {errors.username && <p className="text-xs text-error-600 mt-1">{errors.username}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                ایمیل
                            </label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                className="input-modern"
                                placeholder="ایمیل را وارد کنید"
                            />
                            {errors.email && <p className="text-xs text-error-600 mt-1">{errors.email}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                نام
                            </label>
                            <input
                                type="text"
                                value={formData.first_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                                className="input-modern"
                                placeholder="نام را وارد کنید"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-text-primary mb-2">
                                نام خانوادگی
                            </label>
                            <input
                                type="text"
                                value={formData.last_name}
                                onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                                className="input-modern"
                                placeholder="نام خانوادگی را وارد کنید"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-2">
                            رمز عبور {!user && <span className="text-error-500">*</span>}
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="input-modern"
                            placeholder={user ? "برای تغییر رمز عبور وارد کنید" : "رمز عبور را وارد کنید"}
                            required={!user}
                        />
                        {errors.password && <p className="text-xs text-error-600 mt-1">{errors.password}</p>}
                    </div>

                    {/* Status Toggles */}
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_active}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                                className="w-4 h-4 text-primary-600 rounded border-primary-300"
                            />
                            <span className="text-sm font-medium text-text-primary">کاربر فعال</span>
                        </label>

                        <label className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={formData.is_superuser}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_superuser: e.target.checked }))}
                                className="w-4 h-4 text-primary-600 rounded border-primary-300"
                            />
                            <span className="text-sm font-medium text-text-primary">مدیر کل</span>
                        </label>
                    </div>

                    {/* Role Selection */}
                    <div>
                        <label className="block text-sm font-medium text-text-primary mb-3">
                            نقش‌های سازمانی
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-48 overflow-y-auto border border-primary-200 rounded-lg p-4 bg-surface-secondary">
                            {roles.map(role => (
                                <label key={role.code} className="flex items-center gap-3 p-2 rounded hover:bg-primary-50 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.selected_roles.includes(role.code)}
                                        onChange={() => handleRoleToggle(role.code)}
                                        className="w-4 h-4 text-primary-600 rounded border-primary-300"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-text-primary">{role.name_fa}</span>
                                        <p className="text-xs text-text-secondary">{role.group.name_fa}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-primary-200">
                        <button type="button" onClick={onClose} className="btn-ghost">
                            انصراف
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                            {loading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>در حال ذخیره...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    <span>ذخیره</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default function UserManagement() {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [usersRes, rolesRes] = await Promise.all([
                api.get('/admin/users/'),
                api.get('/admin/roles/')
            ]);
            setUsers(usersRes.data.results || []);
            setRoles(rolesRes.data.results || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveUser = async (userData) => {
        try {
            if (selectedUser) {
                await api.put(`/admin/users/${selectedUser.id}/`, userData);
            } else {
                await api.post('/admin/users/', userData);
            }

            setShowModal(false);
            setSelectedUser(null);
            await fetchData();
        } catch (error) {
            throw error;
        }
    };

    const handleDeleteUser = async (user) => {
        if (window.confirm(`آیا از حذف کاربر "${user.username}" اطمینان دارید؟`)) {
            try {
                await api.delete(`/admin/users/${user.id}/`);
                await fetchData();
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('خطا در حذف کاربر');
            }
        }
    };

    const handleToggleStatus = async (user) => {
        try {
            await api.patch(`/admin/users/${user.id}/`, {
                is_active: !user.is_active
            });
            await fetchData();
        } catch (error) {
            console.error('Error toggling user status:', error);
            alert('خطا در تغییر وضعیت کاربر');
        }
    };

    const filteredUsers = users.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.first_name && user.first_name.includes(searchTerm)) ||
        (user.last_name && user.last_name.includes(searchTerm)) ||
        (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentUsers = filteredUsers.slice(startIndex, endIndex);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    if (loading) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg mx-auto mb-4">
                    <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="text-text-secondary font-medium">در حال بارگذاری کاربران...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-3d-lg">
                        <Users className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-text-primary">مدیریت کاربران</h1>
                        <p className="text-text-secondary mt-1">افزودن، ویرایش و مدیریت کاربران سیستم</p>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setSelectedUser(null);
                        setShowModal(true);
                    }}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    <span>افزودن کاربر جدید</span>
                </button>
            </div>

            {/* Search and Filters */}
            <div className="card-modern p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="جستجو در نام کاربری، نام یا ایمیل..."
                            className="input-modern !pr-10"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-sm text-text-secondary">
                            {filteredUsers.length} کاربر یافت شد
                        </span>
                    </div>
                </div>
            </div>

            {/* Users Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {currentUsers.map(user => (
                    <UserCard
                        key={user.id}
                        user={user}
                        onEdit={(user) => {
                            setSelectedUser(user);
                            setShowModal(true);
                        }}
                        onDelete={handleDeleteUser}
                        onToggleStatus={handleToggleStatus}
                    />
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="card-modern p-4">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-text-secondary">
                            نمایش {startIndex + 1} تا {Math.min(endIndex, filteredUsers.length)} از {filteredUsers.length} کاربر
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="btn-ghost px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                قبلی
                            </button>

                            <div className="flex items-center gap-1">
                                {[...Array(totalPages)].map((_, index) => {
                                    const pageNum = index + 1;
                                    // Show first, last, current, and adjacent pages
                                    if (
                                        pageNum === 1 ||
                                        pageNum === totalPages ||
                                        Math.abs(pageNum - currentPage) <= 1
                                    ) {
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`px-3 py-2 rounded-lg font-medium transition-all ${
                                                    currentPage === pageNum
                                                        ? 'bg-primary-500 text-white shadow-3d-lg'
                                                        : 'bg-surface-secondary text-text-secondary hover:bg-primary-50 hover:text-text-primary border border-primary-100'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    } else if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                                        return <span key={pageNum} className="px-2 text-text-secondary">...</span>;
                                    }
                                    return null;
                                })}
                            </div>

                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="btn-ghost px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                بعدی
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                    <Users className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold text-text-primary mb-2">کاربری یافت نشد</h3>
                    <p className="text-text-secondary mb-6">
                        {searchTerm ? 'نتیجه‌ای برای جستجوی شما یافت نشد' : 'هنوز کاربری در سیستم ثبت نشده است'}
                    </p>
                    <button
                        onClick={() => {
                            setSelectedUser(null);
                            setShowModal(true);
                        }}
                        className="btn-primary flex items-center gap-2 mx-auto"
                    >
                        <Plus className="w-4 h-4" />
                        <span>افزودن اولین کاربر</span>
                    </button>
                </div>
            )}

            {/* User Modal */}
            {showModal && (
                <UserModal
                    user={selectedUser}
                    roles={roles}
                    onSave={handleSaveUser}
                    onClose={() => {
                        setShowModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}
        </div>
    );
}
