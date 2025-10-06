from django.contrib import admin
from .models import OrgRole, OrgRoleGroup, Membership


@admin.register(OrgRoleGroup)
class OrgRoleGroupAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_fa']
    search_fields = ['code', 'name_fa']


@admin.register(OrgRole)
class OrgRoleAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_fa', 'group']
    list_filter = ['group']
    search_fields = ['code', 'name_fa']
    ordering = ['group', 'code']


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'role']
    list_filter = ['role__group', 'role']
    search_fields = ['user__username', 'user__email', 'role__code', 'role__name_fa']
    autocomplete_fields = ['user', 'role']
