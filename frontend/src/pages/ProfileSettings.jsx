// src/pages/ProfileSettings.jsx
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Building, Shield, Key, Save, Loader } from 'lucide-react';
import api from '../api/client';
import useAuth from '../api/useAuth';

export default function ProfileSettings() {
    const { me, loading: loadingAuth, refreshUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileData, setProfileData] = useState({
        first_name: '',
        last_name: '',
        email: ''
    });
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
    const [profileSaveError, setProfileSaveError] = useState(null);

    // Initialize profile data when me loads
    useEffect(() => {
        if (me) {
            setProfileData({
                first_name: me.first_name || '',
                last_name: me.last_name || '',
                email: me.email || ''
            });
        }
    }, [me]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();

        try {
            setSavingProfile(true);
            setProfileSaveError(null);
            await api.patch('/me/', profileData);

            setProfileSaveSuccess(true);
            if (refreshUser) {
                await refreshUser();
            }

            setTimeout(() => setProfileSaveSuccess(false), 3000);
        } catch (error) {
            setProfileSaveError(error.response?.data?.detail || 'خطا در به‌روزرسانی اطلاعات');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            setSaveError('رمز عبور جدید و تکرار آن مطابقت ندارند');
            return;
        }

        if (passwordData.new_password.length < 8) {
            setSaveError('رمز عبور باید حداقل ۸ کاراکتر باشد');
            return;
        }

        try {
            setSaving(true);
            setSaveError(null);
            await api.post('/auth/change-password/', {
                current_password: passwordData.current_password,
                new_password: passwordData.new_password
            });

            setSaveSuccess(true);
            setPasswordData({
                current_password: '',
                new_password: '',
                confirm_password: ''
            });

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            setSaveError(error.response?.data?.detail || 'خطا در تغییر رمز عبور');
        } finally {
            setSaving(false);
        }
    };

    if (loadingAuth || !me) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">تنظیمات پروفایل</h1>
                    <p className="text-text-secondary mt-1">مدیریت اطلاعات کاربری و تنظیمات حساب</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Information Card */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="card-modern">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                                <User className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary">اطلاعات کاربری</h2>
                                <p className="text-sm text-text-secondary">اطلاعات شناسایی شما</p>
                            </div>
                        </div>

                        <form onSubmit={handleProfileUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    نام کاربری
                                </label>
                                <input
                                    type="text"
                                    value={me?.username}
                                    disabled
                                    className="input-modern bg-gray-50"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        نام
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.first_name}
                                        onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                                        className="input-modern"
                                        placeholder="نام خود را وارد کنید"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        نام خانوادگی
                                    </label>
                                    <input
                                        type="text"
                                        value={profileData.last_name}
                                        onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                                        className="input-modern"
                                        placeholder="نام خانوادگی خود را وارد کنید"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    ایمیل
                                </label>
                                <input
                                    type="email"
                                    value={profileData.email}
                                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                                    className="input-modern"
                                    placeholder="ایمیل خود را وارد کنید"
                                />
                            </div>

                            {profileSaveError && (
                                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg text-sm">
                                    {profileSaveError}
                                </div>
                            )}

                            {profileSaveSuccess && (
                                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg text-sm">
                                    اطلاعات با موفقیت به‌روزرسانی شد
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={savingProfile}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {savingProfile ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        در حال ذخیره...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        ذخیره اطلاعات
                                    </>
                                )}
                            </button>
                        </form>
                    </div>

                    {/* Change Password */}
                    <div className="card-modern">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl bg-error-100 flex items-center justify-center">
                                <Key className="w-6 h-6 text-error-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary">تغییر رمز عبور</h2>
                                <p className="text-sm text-text-secondary">رمز عبور خود را به‌روزرسانی کنید</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    رمز عبور فعلی
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                    className="input-modern"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        رمز عبور جدید
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        className="input-modern"
                                        required
                                        minLength={8}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-primary mb-2">
                                        تکرار رمز عبور جدید
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                                        className="input-modern"
                                        required
                                        minLength={8}
                                    />
                                </div>
                            </div>

                            {saveError && (
                                <div className="bg-error-50 border border-error-200 text-error-700 px-4 py-3 rounded-lg text-sm">
                                    {saveError}
                                </div>
                            )}

                            {saveSuccess && (
                                <div className="bg-success-50 border border-success-200 text-success-700 px-4 py-3 rounded-lg text-sm">
                                    رمز عبور با موفقیت تغییر یافت
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={saving}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {saving ? (
                                    <>
                                        <Loader className="w-4 h-4 animate-spin" />
                                        در حال ذخیره...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        ذخیره تغییرات
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-6">
                    {/* Roles Card */}
                    <div className="card-modern">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-warning-600" />
                            </div>
                            <h3 className="text-base font-semibold text-text-primary">نقش‌های کاربری</h3>
                        </div>

                        <div className="space-y-2">
                            {me?.roles && me.roles.length > 0 ? (
                                me.roles.map((role, index) => (
                                    <div
                                        key={index}
                                        className="px-3 py-2 bg-primary-50 rounded-lg border border-primary-200"
                                    >
                                        <div className="text-sm font-medium text-primary-700">{role.name_fa}</div>
                                        <div className="text-xs text-primary-600 mt-0.5">{role.role_group?.name_fa}</div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-text-secondary text-center py-4">
                                    هیچ نقشی تعریف نشده است
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Account Info */}
                    <div className="card-modern">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-lg bg-info-100 flex items-center justify-center">
                                <Building className="w-5 h-5 text-info-600" />
                            </div>
                            <h3 className="text-base font-semibold text-text-primary">اطلاعات حساب</h3>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-secondary">وضعیت حساب:</span>
                                <span className={`font-medium ${me?.is_active ? 'text-success-600' : 'text-error-600'}`}>
                                    {me?.is_active ? 'فعال' : 'غیرفعال'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-secondary">نوع کاربر:</span>
                                <span className="font-medium text-text-primary">
                                    {me?.is_superuser ? 'مدیر سیستم' : 'کاربر عادی'}
                                </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-text-secondary">تاریخ عضویت:</span>
                                <span className="font-medium text-text-primary">
                                    {me?.date_joined ? new Date(me.date_joined).toLocaleDateString('fa-IR') : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
