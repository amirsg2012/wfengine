# apps/permissions/admin.py
"""
DEPRECATED: This admin is for the old multi-level permission system.

For the new simplified state-step based permissions, see admin_simplified.py
The old system will be kept temporarily for backwards compatibility.
"""
from django.contrib import admin
from django.utils.html import format_html
from .models import (
    StatePermission,
    StateStepPermission,
    FormPermission,
    FormFieldPermission,
    PermissionOverride
)

# Import simplified admin to register those models
from . import admin_simplified  # noqa: F401


# DEPRECATED - Commented out to hide from admin panel
# Use the new simplified permission system instead: /admin/permissions/workflowstate/
# @admin.register(StatePermission)
class StatePermissionAdmin(admin.ModelAdmin):
    list_display = [
        'state',
        'permission_type_display',
        'assigned_to',
        'restrict_to_own',
        'is_active'
    ]
    list_filter = ['state', 'permission_type', 'is_active', 'restrict_to_own']
    search_fields = ['state', 'role__code', 'role__name_fa', 'user__username']
    ordering = ['state', 'permission_type', 'role__code']

    fieldsets = (
        ('State & Permission', {
            'fields': ('state', 'permission_type')
        }),
        ('Assign To', {
            'fields': ('role', 'user'),
            'description': 'Assign to either a role OR a specific user'
        }),
        ('Restrictions', {
            'fields': ('restrict_to_own', 'is_active')
        }),
    )

    def permission_type_display(self, obj):
        colors = {
            'VIEW': 'blue',
            'EDIT': 'orange',
            'APPROVE': 'green',
            'TRANSITION': 'purple',
            'DELETE': 'red'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            colors.get(obj.permission_type, 'gray'),
            obj.get_permission_type_display()
        )
    permission_type_display.short_description = 'Permission'

    def assigned_to(self, obj):
        if obj.role:
            return format_html(
                '<strong>Role:</strong> {} ({})',
                obj.role.name_fa,
                obj.role.code
            )
        elif obj.user:
            return format_html(
                '<strong>User:</strong> {}',
                obj.user.username
            )
        return '—'
    assigned_to.short_description = 'Assigned To'


# DEPRECATED - Commented out to hide from admin panel
# @admin.register(StateStepPermission)
class StateStepPermissionAdmin(admin.ModelAdmin):
    list_display = [
        'state',
        'step',
        'action_type_display',
        'section',
        'assigned_to',
        'signature_field',
        'is_active'
    ]
    list_filter = ['state', 'action_type', 'is_active']
    search_fields = ['state', 'section', 'role__code', 'role__name_fa', 'user__username', 'description']
    ordering = ['state', 'step']

    fieldsets = (
        ('Step Configuration', {
            'fields': ('state', 'step', 'description')
        }),
        ('Section & Action', {
            'fields': ('section', 'action_type', 'signature_field'),
            'description': 'Define what this step does (fill section or approve/sign)'
        }),
        ('Assign To', {
            'fields': ('role', 'user'),
            'description': 'Who can perform this step?'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def action_type_display(self, obj):
        if obj.action_type == 'FILL':
            return format_html(
                '<span style="background-color: blue; color: white; padding: 3px 8px; border-radius: 3px;">✏️ Fill</span>'
            )
        elif obj.action_type == 'APPROVE':
            return format_html(
                '<span style="background-color: green; color: white; padding: 3px 8px; border-radius: 3px;">✓ Approve</span>'
            )
        return '—'
    action_type_display.short_description = 'Action'

    def assigned_to(self, obj):
        if obj.role:
            return format_html(
                '<strong>{}</strong><br/><small>{}</small>',
                obj.role.name_fa,
                obj.role.code
            )
        elif obj.user:
            return format_html('<strong>{}</strong>', obj.user.username)
        return '—'
    assigned_to.short_description = 'Assigned To'


# DEPRECATED - Commented out to hide from admin panel
# @admin.register(FormPermission)
class FormPermissionAdmin(admin.ModelAdmin):
    list_display = [
        'form_number',
        'permission_type_display',
        'assigned_to',
        'state',
        'is_active'
    ]
    list_filter = ['form_number', 'permission_type', 'state', 'is_active']
    search_fields = ['role__code', 'role__name_fa', 'user__username', 'state']
    ordering = ['form_number', 'permission_type']

    fieldsets = (
        ('Form & Permission', {
            'fields': ('form_number', 'permission_type', 'state')
        }),
        ('Assign To', {
            'fields': ('role', 'user'),
            'description': 'Assign to either a role OR a specific user'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def permission_type_display(self, obj):
        colors = {
            'VIEW': 'blue',
            'EDIT': 'orange',
            'APPROVE': 'green'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            colors.get(obj.permission_type, 'gray'),
            obj.get_permission_type_display()
        )
    permission_type_display.short_description = 'Permission'

    def assigned_to(self, obj):
        if obj.role:
            return format_html(
                '<strong>{}</strong><br/><small>{}</small>',
                obj.role.name_fa,
                obj.role.code
            )
        elif obj.user:
            return format_html('<strong>{}</strong>', obj.user.username)
        return '—'
    assigned_to.short_description = 'Assigned To'


# DEPRECATED - Commented out to hide from admin panel
# @admin.register(FormFieldPermission)
class FormFieldPermissionAdmin(admin.ModelAdmin):
    list_display = [
        'form_number',
        'field_path',
        'permission_type_display',
        'assigned_to',
        'state',
        'is_active'
    ]
    list_filter = ['form_number', 'permission_type', 'state', 'is_active']
    search_fields = ['field_path', 'role__code', 'role__name_fa', 'user__username']
    ordering = ['form_number', 'field_path']

    fieldsets = (
        ('Field & Permission', {
            'fields': ('form_number', 'field_path', 'permission_type', 'state')
        }),
        ('Assign To', {
            'fields': ('role', 'user'),
            'description': 'Who can access this specific field?'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def permission_type_display(self, obj):
        colors = {
            'VIEW': 'blue',
            'EDIT': 'orange'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            colors.get(obj.permission_type, 'gray'),
            obj.get_permission_type_display()
        )
    permission_type_display.short_description = 'Permission'

    def assigned_to(self, obj):
        if obj.role:
            return format_html(
                '<strong>{}</strong><br/><small>{}</small>',
                obj.role.name_fa,
                obj.role.code
            )
        elif obj.user:
            return format_html('<strong>{}</strong>', obj.user.username)
        return '—'
    assigned_to.short_description = 'Assigned To'


# DEPRECATED - Commented out to hide from admin panel
# @admin.register(PermissionOverride)
class PermissionOverrideAdmin(admin.ModelAdmin):
    list_display = [
        'workflow',
        'user',
        'permission_type_display',
        'form_number',
        'expires_at',
        'is_active',
        'granted_by'
    ]
    list_filter = ['permission_type', 'is_active', 'expires_at']
    search_fields = ['user__username', 'granted_by__username', 'reason']
    readonly_fields = ['created_at']
    ordering = ['-created_at']

    fieldsets = (
        ('Override Details', {
            'fields': ('workflow', 'user', 'permission_type')
        }),
        ('Scope', {
            'fields': ('form_number', 'field_path'),
            'description': 'Optional: Limit override to specific form or field'
        }),
        ('Grant Information', {
            'fields': ('granted_by', 'reason', 'expires_at')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at')
        }),
    )

    def permission_type_display(self, obj):
        colors = {
            'VIEW': 'blue',
            'EDIT': 'orange',
            'APPROVE': 'green'
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            colors.get(obj.permission_type, 'gray'),
            obj.get_permission_type_display()
        )
    permission_type_display.short_description = 'Permission'
