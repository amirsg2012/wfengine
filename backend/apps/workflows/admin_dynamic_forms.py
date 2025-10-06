# apps/workflows/admin_dynamic_forms.py
"""
Comprehensive admin interface for dynamic forms
Allows complete form configuration from Django admin
"""
from django.contrib import admin
from django.utils.html import format_html
from .models_dynamic_forms import DynamicForm, FormSection, FormField


class FormFieldInline(admin.TabularInline):
    model = FormField
    extra = 1
    fields = [
        'display_order',
        'code',
        'label_fa',
        'field_type',
        'is_required',
        'placeholder',
        'is_active'
    ]
    ordering = ['display_order']


class FormSectionInline(admin.StackedInline):
    model = FormSection
    extra = 0
    fields = [
        'code',
        'title_fa',
        'title_en',
        'display_order',
        'required_step',
        'requires_signature',
        'signature_field_code',
        'signature_step',
        'description',
        'is_active'
    ]
    ordering = ['display_order']


@admin.register(DynamicForm)
class DynamicFormAdmin(admin.ModelAdmin):
    list_display = [
        'form_number',
        'title_fa',
        'state',
        'has_multiple_steps',
        'total_steps',
        'sections_count',
        'fields_count',
        'is_active'
    ]
    list_filter = ['is_active', 'has_multiple_steps', 'state']
    search_fields = ['title_fa', 'title_en', 'form_number']
    ordering = ['display_order', 'form_number']

    fieldsets = (
        ('Basic Information', {
            'fields': ('form_number', 'title_fa', 'title_en', 'state', 'description')
        }),
        ('Multi-Step Configuration', {
            'fields': ('has_multiple_steps', 'total_steps'),
            'description': 'Configure if this form has multiple approval/fill steps'
        }),
        ('Display Settings', {
            'fields': ('display_order', 'is_active')
        }),
    )

    inlines = [FormSectionInline]

    def sections_count(self, obj):
        count = obj.sections.count()
        return format_html(
            '<span style="color: {};">{} sections</span>',
            'green' if count > 0 else 'gray',
            count
        )
    sections_count.short_description = 'Sections'

    def fields_count(self, obj):
        count = obj.fields.count()
        return format_html(
            '<span style="color: {};">{} fields</span>',
            'green' if count > 0 else 'gray',
            count
        )
    fields_count.short_description = 'Fields'


@admin.register(FormSection)
class FormSectionAdmin(admin.ModelAdmin):
    list_display = [
        'form',
        'title_fa',
        'code',
        'required_step',
        'requires_signature_display',
        'signature_step',
        'fields_count',
        'is_active'
    ]
    list_filter = ['form', 'requires_signature', 'is_active']
    search_fields = ['title_fa', 'title_en', 'code']
    ordering = ['form', 'display_order']

    fieldsets = (
        ('Basic Information', {
            'fields': ('form', 'code', 'title_fa', 'title_en', 'description')
        }),
        ('Step & Permission Configuration', {
            'fields': ('required_step', 'display_order'),
            'description': 'Which step can access this section?'
        }),
        ('Signature Configuration', {
            'fields': ('requires_signature', 'signature_field_code', 'signature_step'),
            'description': 'Signature settings for section approval'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    inlines = [FormFieldInline]

    def requires_signature_display(self, obj):
        if obj.requires_signature:
            return format_html(
                '<span style="color: green;">✓ {}</span>',
                obj.signature_field_code or 'Yes'
            )
        return format_html('<span style="color: gray;">—</span>')
    requires_signature_display.short_description = 'Signature Required'

    def fields_count(self, obj):
        count = obj.fields.count()
        return format_html(
            '<span style="color: {};">{}</span>',
            'green' if count > 0 else 'gray',
            count
        )
    fields_count.short_description = 'Fields'


@admin.register(FormField)
class FormFieldAdmin(admin.ModelAdmin):
    list_display = [
        'form',
        'section_display',
        'label_fa',
        'code',
        'field_type',
        'is_required',
        'validation_summary',
        'is_active'
    ]
    list_filter = ['form', 'section', 'field_type', 'is_required', 'is_active']
    search_fields = ['label_fa', 'label_en', 'code']
    ordering = ['form', 'section', 'display_order']

    fieldsets = (
        ('Basic Information', {
            'fields': ('form', 'section', 'code', 'label_fa', 'label_en', 'field_type')
        }),
        ('Validation & Requirements', {
            'fields': (
                'is_required',
                'min_length',
                'max_length',
                'min_value',
                'max_value',
                'regex_pattern',
                'validation_message'
            )
        }),
        ('Display & UX', {
            'fields': (
                'placeholder',
                'help_text',
                'default_value',
                'css_class',
                'display_order'
            )
        }),
        ('Field Options', {
            'fields': ('options_json',),
            'description': 'JSON configuration for dropdowns, radios, etc.'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def section_display(self, obj):
        if obj.section:
            return obj.section.title_fa
        return format_html('<span style="color: gray;">—</span>')
    section_display.short_description = 'Section'

    def validation_summary(self, obj):
        rules = []
        if obj.is_required:
            rules.append('Required')
        if obj.min_length or obj.max_length:
            rules.append(f'Length: {obj.min_length or "?"}-{obj.max_length or "?"}')
        if obj.min_value is not None or obj.max_value is not None:
            rules.append(f'Value: {obj.min_value or "?"}-{obj.max_value or "?"}')
        if obj.regex_pattern:
            rules.append('Regex')

        return ', '.join(rules) if rules else '—'
    validation_summary.short_description = 'Validation'
