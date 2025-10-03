# apps/workflows/admin.py
from django.contrib import admin
from .models import (
    Workflow, Action, Attachment, Comment,
    WorkflowTemplate, WorkflowState, WorkflowStateStep, WorkflowTransition
)


# ==================== Configurable Workflow System Admin ====================

class WorkflowStateInline(admin.TabularInline):
    model = WorkflowState
    extra = 0
    fields = ['code', 'name_fa', 'state_type', 'form_number', 'order', 'is_initial', 'is_terminal']
    show_change_link = True


class WorkflowTransitionInline(admin.TabularInline):
    model = WorkflowTransition
    extra = 0
    fk_name = 'template'
    fields = ['from_state', 'to_state', 'condition_type', 'is_automatic', 'order']
    show_change_link = True


@admin.register(WorkflowTemplate)
class WorkflowTemplateAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_fa', 'is_active', 'state_count', 'workflow_count', 'created_at', 'created_by']
    list_filter = ['is_active', 'created_at']
    search_fields = ['code', 'name', 'name_fa']
    readonly_fields = ['created_at', 'updated_at', 'created_by', 'state_count', 'transition_count', 'workflow_count']
    inlines = [WorkflowStateInline, WorkflowTransitionInline]

    fieldsets = (
        ('Template Information', {
            'fields': ('code', 'name', 'name_fa', 'description', 'is_active')
        }),
        ('Statistics', {
            'fields': ('state_count', 'transition_count', 'workflow_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at', 'created_by'),
            'classes': ('collapse',)
        }),
    )

    def state_count(self, obj):
        """Count of states in this template"""
        return obj.states.count()
    state_count.short_description = 'States'

    def transition_count(self, obj):
        """Count of transitions in this template"""
        return obj.transitions.count()
    transition_count.short_description = 'Transitions'

    def workflow_count(self, obj):
        """Count of workflow instances using this template"""
        return obj.instances.count()
    workflow_count.short_description = 'Workflows'

    def save_model(self, request, obj, form, change):
        if not change:  # If creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


class WorkflowStateStepInline(admin.TabularInline):
    model = WorkflowStateStep
    extra = 0
    fields = ['step_number', 'name_fa', 'required_role_code', 'form_number', 'requires_signature', 'requires_comment', 'parallel_group']
    show_change_link = True


@admin.register(WorkflowState)
class WorkflowStateAdmin(admin.ModelAdmin):
    list_display = ['code', 'name_fa', 'template', 'state_type', 'form_number', 'order', 'step_count', 'is_initial', 'is_terminal']
    list_filter = ['template', 'state_type', 'is_initial', 'is_terminal']
    search_fields = ['code', 'name', 'name_fa']
    readonly_fields = ['created_at', 'updated_at', 'step_count', 'transitions_from_count', 'transitions_to_count']
    inlines = [WorkflowStateStepInline]
    list_editable = ['order']
    ordering = ['template', 'order']

    fieldsets = (
        ('State Information', {
            'fields': ('template', 'code', 'name', 'name_fa', 'description')
        }),
        ('State Type & Form', {
            'fields': ('state_type', 'form_number', 'form_schema')
        }),
        ('Flow Control', {
            'fields': ('order', 'is_initial', 'is_terminal')
        }),
        ('Behavior', {
            'fields': ('allow_edit', 'allow_back', 'require_all_steps')
        }),
        ('Statistics', {
            'fields': ('step_count', 'transitions_from_count', 'transitions_to_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def step_count(self, obj):
        """Count of approval steps in this state"""
        return obj.steps.count()
    step_count.short_description = 'Steps'

    def transitions_from_count(self, obj):
        """Count of transitions from this state"""
        return obj.transitions_from.count()
    transitions_from_count.short_description = 'Transitions From'

    def transitions_to_count(self, obj):
        """Count of transitions to this state"""
        return obj.transitions_to.count()
    transitions_to_count.short_description = 'Transitions To'


@admin.register(WorkflowStateStep)
class WorkflowStateStepAdmin(admin.ModelAdmin):
    list_display = ['state', 'step_number', 'name_fa', 'required_role_code', 'form_number', 'requires_signature', 'requires_comment']
    list_filter = ['state__template', 'requires_signature', 'requires_comment']
    search_fields = ['name', 'name_fa', 'state__code', 'required_role_code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Step Information', {
            'fields': ('state', 'step_number', 'name', 'name_fa', 'description')
        }),
        ('Role & Form', {
            'fields': ('required_role_code', 'form_number', 'form_schema')
        }),
        ('Requirements', {
            'fields': ('requires_signature', 'signature_field_path', 'requires_comment')
        }),
        ('Editable Fields', {
            'fields': ('editable_fields',)
        }),
        ('Parallel Processing', {
            'fields': ('parallel_group',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(WorkflowTransition)
class WorkflowTransitionAdmin(admin.ModelAdmin):
    list_display = ['template', 'from_state', 'to_state', 'condition_type', 'is_automatic', 'order']
    list_filter = ['template', 'condition_type', 'is_automatic']
    search_fields = ['name', 'name_fa', 'from_state__code', 'to_state__code']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Transition Information', {
            'fields': ('template', 'name', 'name_fa')
        }),
        ('States', {
            'fields': ('from_state', 'to_state')
        }),
        ('Conditions', {
            'fields': ('condition_type', 'condition_config', 'is_automatic')
        }),
        ('Display', {
            'fields': ('order',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


# ==================== Legacy Workflow Admin ====================

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "current_state_display", "template", "created_by", "created_at")
    list_filter = ("template", "current_state", "created_at")
    search_fields = ("title",)
    readonly_fields = ("created_at", "updated_at", "current_step", "completed_steps", "state", "is_configurable_display", "available_transitions_display")

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'body', 'created_by')
        }),
        ('Configurable Workflow System', {
            'fields': ('template', 'current_state', 'current_step', 'completed_steps', 'available_transitions_display'),
            'description': 'Dynamic workflow system (default for all new workflows)'
        }),
        ('Data', {
            'fields': ('_data',),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('System Fields (Read-Only)', {
            'fields': ('state', 'is_configurable_display'),
            'classes': ('collapse',),
            'description': 'System-managed fields - do not modify'
        }),
    )

    def current_state_display(self, obj):
        """Show current state name"""
        if obj.is_configurable() and obj.current_state:
            return obj.current_state.name_fa
        return obj.state
    current_state_display.short_description = 'Current State'

    def is_configurable_display(self, obj):
        """Show if workflow uses configurable system"""
        return "✓ Configurable" if obj.is_configurable() else "✗ Legacy FSM"
    is_configurable_display.short_description = 'Type'

    def available_transitions_display(self, obj):
        """Show available transitions for configurable workflows"""
        if not obj.is_configurable():
            return "N/A (Legacy workflow)"

        from apps.workflows.models import WorkflowTransition
        transitions = WorkflowTransition.objects.filter(
            template=obj.template,
            from_state=obj.current_state
        ).select_related('to_state')

        if not transitions:
            return "No transitions defined"

        result = []
        for t in transitions:
            condition_met = t.check_condition(obj)
            status = "✓" if condition_met else "✗"
            result.append(f"{status} {t.to_state.name_fa} ({t.condition_type})")

        return " | ".join(result)
    available_transitions_display.short_description = 'Available Transitions'

    def save_model(self, request, obj, form, change):
        """Auto-assign template and initial state when creating new workflow"""
        if not change:  # If creating new workflow
            # Set created_by
            obj.created_by = request.user

            # Auto-assign default template if not set
            if not obj.template:
                # Get PROPERTY_ACQUISITION template first, fallback to any active template
                default_template = WorkflowTemplate.objects.filter(
                    code='PROPERTY_ACQUISITION',
                    is_active=True
                ).first()

                if not default_template:
                    default_template = WorkflowTemplate.objects.filter(is_active=True).first()

                if default_template:
                    obj.template = default_template

                    # Set initial state
                    if not obj.current_state:
                        initial_state = WorkflowState.objects.filter(
                            template=default_template,
                            is_initial=True
                        ).first()
                        if initial_state:
                            obj.current_state = initial_state
                            obj.current_step = 0
                            obj.completed_steps = {}

        # Save the object first
        super().save_model(request, obj, form, change)

        # Update legacy state field using queryset.update to bypass FSM protection
        if not change and obj.current_state:
            Workflow.objects.filter(pk=obj.pk).update(state=obj.current_state.code)


@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ("workflow_id", "state", "step", "action_type", "performer", "role_code", "created_at")
    list_filter = ("state", "action_type", "role_code")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("workflow", "file", "uploaded_by", "uploaded_at")


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("workflow", "author", "created_at")