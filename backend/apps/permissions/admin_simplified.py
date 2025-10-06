# apps/permissions/admin_simplified.py
"""
Admin interface for simplified state-step based permission system.
"""
from django.contrib import admin
from .models_simplified import (
    WorkflowState,
    WorkflowStateStep,
    WorkflowStateStepPermission,
    WorkflowStepCompletion,
    StepPermissionOverride,
)


class WorkflowStateStepInline(admin.TabularInline):
    """Inline for managing steps within a state"""
    model = WorkflowStateStep
    extra = 1
    fields = ['step_number', 'name_fa', 'action_type', 'signature_field', 'requires_all_approvers', 'is_active']
    ordering = ['step_number']


class WorkflowStateStepPermissionInline(admin.TabularInline):
    """Inline for managing permissions for a step"""
    model = WorkflowStateStepPermission
    extra = 1
    fields = ['role', 'user', 'is_active']
    autocomplete_fields = ['role', 'user']


@admin.register(WorkflowState)
class WorkflowStateAdmin(admin.ModelAdmin):
    """Admin for workflow states"""
    list_display = ['code', 'name_fa', 'name_en', 'form_number', 'form_section', 'order', 'is_active']
    list_filter = ['is_active', 'form_number']
    search_fields = ['code', 'name_fa', 'name_en']
    ordering = ['order']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('code', 'name_fa', 'name_en', 'order', 'is_active')
        }),
        ('ارتباط با فرم', {
            'fields': ('form_number', 'form_section'),
            'classes': ('collapse',),
        }),
    )

    inlines = [WorkflowStateStepInline]


@admin.register(WorkflowStateStep)
class WorkflowStateStepAdmin(admin.ModelAdmin):
    """Admin for workflow state steps"""
    list_display = ['__str__', 'state', 'step_number', 'name_fa', 'action_type', 'requires_all_approvers', 'is_active']
    list_filter = ['state', 'action_type', 'requires_all_approvers', 'is_active']
    search_fields = ['name_fa', 'name_en', 'state__code', 'state__name_fa']
    ordering = ['state__order', 'step_number']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('state', 'step_number', 'name_fa', 'name_en', 'description_fa')
        }),
        ('تنظیمات گام', {
            'fields': ('action_type', 'signature_field', 'requires_all_approvers', 'is_active')
        }),
    )

    inlines = [WorkflowStateStepPermissionInline]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('state')


@admin.register(WorkflowStateStepPermission)
class WorkflowStateStepPermissionAdmin(admin.ModelAdmin):
    """Admin for step permissions"""
    list_display = ['__str__', 'step_state', 'step_number', 'role', 'user', 'is_active']
    list_filter = ['is_active', 'step__state', 'step__action_type']
    search_fields = ['role__code', 'role__name_fa', 'user__username', 'step__name_fa', 'step__state__code']
    autocomplete_fields = ['step', 'role', 'user']
    ordering = ['step__state__order', 'step__step_number']

    fieldsets = (
        ('گام', {
            'fields': ('step',)
        }),
        ('دسترسی', {
            'fields': ('role', 'user', 'is_active'),
            'description': 'یا نقش یا کاربر را مشخص کنید (نه هر دو)'
        }),
    )

    def step_state(self, obj):
        return obj.step.state.code
    step_state.short_description = 'وضعیت'

    def step_number(self, obj):
        return obj.step.step_number
    step_number.short_description = 'شماره گام'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('step', 'step__state', 'role', 'user')


@admin.register(WorkflowStepCompletion)
class WorkflowStepCompletionAdmin(admin.ModelAdmin):
    """Admin for step completions (audit trail)"""
    list_display = ['workflow_id', 'step_state', 'step_number', 'completed_by', 'role_code', 'completed_at']
    list_filter = ['step__state', 'completed_at', 'role_code']
    search_fields = ['workflow__pk', 'completed_by__username', 'step__name_fa', 'step__state__code']
    date_hierarchy = 'completed_at'
    ordering = ['-completed_at']
    readonly_fields = ['workflow', 'step', 'completed_by', 'completed_at', 'role_code', 'data_snapshot']

    fieldsets = (
        ('اطلاعات تکمیل', {
            'fields': ('workflow', 'step', 'completed_by', 'role_code', 'completed_at')
        }),
        ('داده‌ها', {
            'fields': ('data_snapshot',),
            'classes': ('collapse',),
        }),
    )

    def workflow_id(self, obj):
        return str(obj.workflow.pk)
    workflow_id.short_description = 'شناسه گردش کار'

    def step_state(self, obj):
        return obj.step.state.code
    step_state.short_description = 'وضعیت'

    def step_number(self, obj):
        return obj.step.step_number
    step_number.short_description = 'گام'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('workflow', 'step', 'step__state', 'completed_by')

    def has_add_permission(self, request):
        """Completions are created automatically, not manually"""
        return False

    def has_delete_permission(self, request, obj=None):
        """Completions are audit trail, should not be deleted"""
        return False


@admin.register(StepPermissionOverride)
class StepPermissionOverrideAdmin(admin.ModelAdmin):
    """Admin for temporary permission overrides"""
    list_display = ['workflow_id', 'user', 'step_info', 'granted_by', 'expires_at', 'is_active', 'is_valid_now']
    list_filter = ['is_active', 'expires_at', 'created_at']
    search_fields = ['workflow__pk', 'user__username', 'granted_by__username', 'reason']
    date_hierarchy = 'created_at'
    autocomplete_fields = ['workflow', 'user', 'step', 'granted_by']
    ordering = ['-created_at']

    fieldsets = (
        ('اطلاعات اصلی', {
            'fields': ('workflow', 'user', 'step')
        }),
        ('اعتبار', {
            'fields': ('expires_at', 'is_active')
        }),
        ('اطلاعات اعطا', {
            'fields': ('granted_by', 'reason', 'created_at'),
            'classes': ('collapse',),
        }),
    )

    readonly_fields = ['created_at']

    def workflow_id(self, obj):
        return str(obj.workflow.pk)
    workflow_id.short_description = 'شناسه گردش کار'

    def step_info(self, obj):
        if obj.step:
            return f"{obj.step.state.code} - Step {obj.step.step_number}"
        return "همه گام‌ها"
    step_info.short_description = 'گام'

    def is_valid_now(self, obj):
        return obj.is_valid()
    is_valid_now.boolean = True
    is_valid_now.short_description = 'معتبر'

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('workflow', 'user', 'step', 'step__state', 'granted_by')
