# apps/forms/admin.py
"""
Admin interface for dynamic form builder
"""
from django.contrib import admin
from .models import FormField, DynamicForm, FormSection, FormFieldMapping, FormData


class FormFieldMappingInline(admin.TabularInline):
    model = FormFieldMapping
    extra = 0
    fields = ['field', 'order', 'is_required', 'is_readonly', 'is_hidden', 'default_value']
    autocomplete_fields = ['field']
    show_change_link = True


class FormSectionInline(admin.StackedInline):
    model = FormSection
    extra = 0
    fields = ['code', 'name', 'name_fa', 'description', 'order', 'is_collapsible', 'is_collapsed_default']
    show_change_link = True


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name_fa', 'field_type', 'is_required', 'is_computed',
        'is_active', 'usage_count'
    ]
    list_filter = ['field_type', 'is_required', 'is_computed', 'is_active']
    search_fields = ['code', 'name', 'name_fa', 'description']
    readonly_fields = ['created_at', 'updated_at', 'usage_count']

    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'name', 'name_fa', 'description')
        }),
        ('Field Type', {
            'fields': ('field_type', 'width')
        }),
        ('Computed Field', {
            'fields': ('is_computed', 'source_fields', 'computation_rule'),
            'classes': ('collapse',)
        }),
        ('Validation', {
            'fields': (
                'is_required', 'min_length', 'max_length',
                'min_value', 'max_value', 'pattern', 'validation_message'
            ),
            'classes': ('collapse',)
        }),
        ('Options (Select/Radio)', {
            'fields': ('options',),
            'classes': ('collapse',),
            'description': 'JSON array of {value, label, label_fa} objects'
        }),
        ('UI Properties', {
            'fields': (
                'placeholder', 'placeholder_fa',
                'default_value', 'help_text', 'help_text_fa'
            ),
            'classes': ('collapse',)
        }),
        ('Data Storage', {
            'fields': ('data_path', 'display_order'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'created_by', 'created_at', 'updated_at', 'usage_count')
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # If creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def usage_count(self, obj):
        """Count how many forms use this field"""
        return obj.form_mappings.count()
    usage_count.short_description = 'Used in Forms'


@admin.register(DynamicForm)
class DynamicFormAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'name_fa', 'form_number', 'version',
        'section_count', 'field_count', 'is_active'
    ]
    list_filter = ['is_active', 'form_number']
    search_fields = ['code', 'name', 'name_fa', 'description']
    readonly_fields = ['created_at', 'updated_at', 'section_count', 'field_count']
    inlines = [FormSectionInline]

    fieldsets = (
        ('Form Information', {
            'fields': ('code', 'name', 'name_fa', 'description')
        }),
        ('Configuration', {
            'fields': ('form_number', 'version', 'is_active')
        }),
        ('Statistics', {
            'fields': ('section_count', 'field_count'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def save_model(self, request, obj, form, change):
        if not change:  # If creating new
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def section_count(self, obj):
        """Count of sections in this form"""
        return obj.sections.count()
    section_count.short_description = 'Sections'

    def field_count(self, obj):
        """Count of total fields in this form"""
        count = 0
        for section in obj.sections.all():
            count += section.field_mappings.count()
        return count
    field_count.short_description = 'Fields'

    actions = ['duplicate_form', 'export_schema']

    def duplicate_form(self, request, queryset):
        """Duplicate selected forms"""
        for form in queryset:
            # Create new form
            new_form = DynamicForm.objects.create(
                code=f"{form.code}_copy",
                name=f"{form.name} (Copy)",
                name_fa=f"{form.name_fa} (کپی)",
                description=form.description,
                form_number=None,
                version=1,
                is_active=False,
                created_by=request.user
            )

            # Copy sections and fields
            for section in form.sections.all():
                new_section = FormSection.objects.create(
                    form=new_form,
                    code=section.code,
                    name=section.name,
                    name_fa=section.name_fa,
                    description=section.description,
                    order=section.order,
                    is_collapsible=section.is_collapsible,
                    is_collapsed_default=section.is_collapsed_default
                )

                # Copy field mappings
                for mapping in section.field_mappings.all():
                    FormFieldMapping.objects.create(
                        section=new_section,
                        field=mapping.field,
                        order=mapping.order,
                        is_required=mapping.is_required,
                        is_readonly=mapping.is_readonly,
                        is_hidden=mapping.is_hidden,
                        default_value=mapping.default_value,
                        show_if_field=mapping.show_if_field,
                        show_if_value=mapping.show_if_value
                    )

            self.message_user(request, f"Form '{form.code}' duplicated as '{new_form.code}'")

    duplicate_form.short_description = "Duplicate selected forms"

    def export_schema(self, request, queryset):
        """Export form schema as JSON"""
        import json
        from django.http import JsonResponse

        schemas = []
        for form in queryset:
            schemas.append(form.get_schema())

        response = JsonResponse(schemas, safe=False, json_dumps_params={'indent': 2, 'ensure_ascii': False})
        response['Content-Disposition'] = 'attachment; filename="form_schemas.json"'
        return response

    export_schema.short_description = "Export form schemas as JSON"


@admin.register(FormSection)
class FormSectionAdmin(admin.ModelAdmin):
    list_display = ['form', 'code', 'name_fa', 'order', 'field_count', 'is_collapsible']
    list_filter = ['form', 'is_collapsible']
    search_fields = ['code', 'name', 'name_fa', 'form__code']
    inlines = [FormFieldMappingInline]
    list_editable = ['order']

    fieldsets = (
        ('Section Information', {
            'fields': ('form', 'code', 'name', 'name_fa', 'description')
        }),
        ('Display', {
            'fields': ('order', 'is_collapsible', 'is_collapsed_default')
        }),
    )

    def field_count(self, obj):
        """Count of fields in this section"""
        return obj.field_mappings.count()
    field_count.short_description = 'Fields'


@admin.register(FormFieldMapping)
class FormFieldMappingAdmin(admin.ModelAdmin):
    list_display = [
        'section', 'field', 'order', 'is_required',
        'is_readonly', 'is_hidden'
    ]
    list_filter = ['section__form', 'is_required', 'is_readonly', 'is_hidden']
    search_fields = ['field__code', 'field__name', 'section__name']
    autocomplete_fields = ['section', 'field']
    list_editable = ['order']

    fieldsets = (
        ('Mapping', {
            'fields': ('section', 'field', 'order')
        }),
        ('Overrides', {
            'fields': ('is_required', 'is_readonly', 'is_hidden', 'default_value')
        }),
        ('Conditional Display', {
            'fields': ('show_if_field', 'show_if_value'),
            'classes': ('collapse',)
        }),
    )


@admin.register(FormData)
class FormDataAdmin(admin.ModelAdmin):
    list_display = [
        'workflow', 'form', 'form_version',
        'submitted_by', 'submitted_at'
    ]
    list_filter = ['form', 'submitted_at']
    search_fields = ['workflow__title', 'form__code', 'submitted_by__username']
    readonly_fields = ['workflow', 'form', 'form_version', 'submitted_by', 'submitted_at', 'data']

    fieldsets = (
        ('Submission Information', {
            'fields': ('workflow', 'form', 'form_version')
        }),
        ('Data', {
            'fields': ('data',),
            'description': 'Submitted form field values'
        }),
        ('Metadata', {
            'fields': ('submitted_by', 'submitted_at')
        }),
    )

    def has_add_permission(self, request):
        return False  # Form data is created via API, not manually

    def has_change_permission(self, request, obj=None):
        return False  # Form data should not be edited manually
