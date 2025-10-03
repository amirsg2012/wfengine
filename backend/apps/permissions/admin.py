# apps/permissions/admin.py
from django.contrib import admin
from .models import (
    StatePermission,
    StateStepPermission,
    FormPermission,
    FormFieldPermission,
    PermissionOverride
)


@admin.register(StatePermission)
class StatePermissionAdmin(admin.ModelAdmin):
    list_display = ['state', 'permission_type', 'role', 'user', 'restrict_to_own', 'is_active']
    list_filter = ['state', 'permission_type', 'is_active', 'restrict_to_own']
    search_fields = ['state', 'role__code', 'user__username']
    ordering = ['state', 'permission_type']


@admin.register(StateStepPermission)
class StateStepPermissionAdmin(admin.ModelAdmin):
    list_display = ['state', 'step', 'role', 'user', 'is_active']
    list_filter = ['state', 'is_active']
    search_fields = ['state', 'role__code', 'user__username']
    ordering = ['state', 'step']


@admin.register(FormPermission)
class FormPermissionAdmin(admin.ModelAdmin):
    list_display = ['form_number', 'permission_type', 'role', 'user', 'state', 'is_active']
    list_filter = ['form_number', 'permission_type', 'state', 'is_active']
    search_fields = ['role__code', 'user__username', 'state']
    ordering = ['form_number', 'permission_type']


@admin.register(FormFieldPermission)
class FormFieldPermissionAdmin(admin.ModelAdmin):
    list_display = ['form_number', 'field_path', 'permission_type', 'role', 'user', 'state', 'is_active']
    list_filter = ['form_number', 'permission_type', 'state', 'is_active']
    search_fields = ['field_path', 'role__code', 'user__username']
    ordering = ['form_number', 'field_path']


@admin.register(PermissionOverride)
class PermissionOverrideAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'user', 'permission_type', 'form_number', 'expires_at', 'is_active', 'granted_by']
    list_filter = ['permission_type', 'is_active', 'expires_at']
    search_fields = ['user__username', 'granted_by__username', 'reason']
    readonly_fields = ['created_at']
    ordering = ['-created_at']
