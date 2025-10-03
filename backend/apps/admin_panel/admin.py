# apps/admin_panel/admin.py
from django.contrib import admin
from .models import SystemSettings, UserSession, AuditLog


@admin.register(SystemSettings)
class SystemSettingsAdmin(admin.ModelAdmin):
    list_display = ('key', 'value', 'value_type', 'category', 'is_public', 'updated_at')
    list_filter = ('category', 'value_type', 'is_public')
    search_fields = ('key', 'description')
    readonly_fields = ('updated_at', 'created_at')


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ip_address', 'last_activity', 'created_at')
    list_filter = ('last_activity',)
    search_fields = ('user__username', 'ip_address')
    readonly_fields = ('created_at', 'last_activity')


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'model_name', 'object_id', 'timestamp')
    list_filter = ('action', 'model_name', 'timestamp')
    search_fields = ('user__username', 'action', 'model_name', 'object_id')
    readonly_fields = ('timestamp',)
    date_hierarchy = 'timestamp'
