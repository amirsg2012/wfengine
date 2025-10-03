# apps/forms/models.py
"""
Dynamic form system with field reusability and composition
"""
from django.db import models
from django.contrib.auth import get_user_model
from django_mongodb_backend.fields import ObjectIdAutoField
import json

User = get_user_model()


class FieldType(models.TextChoices):
    """Field data types"""
    TEXT = 'TEXT', 'Text'
    TEXTAREA = 'TEXTAREA', 'Text Area'
    NUMBER = 'NUMBER', 'Number'
    EMAIL = 'EMAIL', 'Email'
    PHONE = 'PHONE', 'Phone'
    DATE = 'DATE', 'Date'
    DATETIME = 'DATETIME', 'Date Time'
    SELECT = 'SELECT', 'Select (Dropdown)'
    MULTI_SELECT = 'MULTI_SELECT', 'Multi Select'
    CHECKBOX = 'CHECKBOX', 'Checkbox'
    RADIO = 'RADIO', 'Radio Button'
    FILE = 'FILE', 'File Upload'
    IMAGE = 'IMAGE', 'Image Upload'
    SIGNATURE = 'SIGNATURE', 'Signature'
    COMPUTED = 'COMPUTED', 'Computed Field'  # Derived from other fields
    SECTION = 'SECTION', 'Section Header'


class FormField(models.Model):
    """
    Reusable form field definition
    Fields can be used across multiple forms and composed from other fields
    """
    id = ObjectIdAutoField(primary_key=True)

    # Basic Info
    code = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique field identifier (e.g., 'first_name', 'national_code')"
    )
    name = models.CharField(max_length=255, help_text="Field name in English")
    name_fa = models.CharField(max_length=255, help_text="Field name in Persian")
    description = models.TextField(blank=True, help_text="Field description")

    # Field Type
    field_type = models.CharField(
        max_length=20,
        choices=FieldType.choices,
        default=FieldType.TEXT
    )

    # Field Composition (for COMPUTED fields)
    is_computed = models.BooleanField(
        default=False,
        help_text="Is this field computed from other fields?"
    )
    source_fields = models.JSONField(
        default=list,
        blank=True,
        help_text="List of field codes this field is computed from"
    )
    computation_rule = models.TextField(
        blank=True,
        help_text="JavaScript expression or template for computing value (e.g., '{first_name} {last_name}')"
    )

    # Validation
    is_required = models.BooleanField(default=False)
    min_length = models.IntegerField(null=True, blank=True)
    max_length = models.IntegerField(null=True, blank=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    pattern = models.CharField(
        max_length=255,
        blank=True,
        help_text="Regex pattern for validation"
    )
    validation_message = models.CharField(
        max_length=255,
        blank=True,
        help_text="Custom validation error message"
    )

    # Options (for SELECT, RADIO, etc.)
    options = models.JSONField(
        default=list,
        blank=True,
        help_text="List of {value, label, label_fa} for select/radio fields"
    )

    # UI Properties
    placeholder = models.CharField(max_length=255, blank=True)
    placeholder_fa = models.CharField(max_length=255, blank=True)
    default_value = models.CharField(max_length=255, blank=True)
    help_text = models.TextField(blank=True)
    help_text_fa = models.TextField(blank=True)

    # Display
    display_order = models.IntegerField(default=0)
    width = models.CharField(
        max_length=20,
        default='full',
        help_text="Field width: full, half, third, quarter"
    )

    # Data Storage
    data_path = models.CharField(
        max_length=255,
        blank=True,
        help_text="JSON path where field data is stored (e.g., 'personalInfo.firstName')"
    )

    # Metadata
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_fields'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'code']
        verbose_name = "Form Field"
        verbose_name_plural = "Form Fields"
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['field_type']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name_fa}"

    def get_validation_rules(self):
        """Get validation rules as dict for frontend"""
        rules = {}

        if self.is_required:
            rules['required'] = True

        if self.min_length is not None:
            rules['minLength'] = self.min_length

        if self.max_length is not None:
            rules['maxLength'] = self.max_length

        if self.min_value is not None:
            rules['min'] = self.min_value

        if self.max_value is not None:
            rules['max'] = self.max_value

        if self.pattern:
            rules['pattern'] = self.pattern

        if self.validation_message:
            rules['message'] = self.validation_message

        return rules

    def compute_value(self, data_context):
        """Compute field value from source fields"""
        if not self.is_computed or not self.computation_rule:
            return None

        # Get values from source fields
        values = {}
        for field_code in self.source_fields:
            values[field_code] = data_context.get(field_code, '')

        # Simple template substitution (can be enhanced with JS evaluation)
        result = self.computation_rule
        for key, value in values.items():
            result = result.replace(f'{{{key}}}', str(value))

        return result


class DynamicForm(models.Model):
    """
    Dynamic form definition
    Forms are composed of reusable fields
    """
    id = ObjectIdAutoField(primary_key=True)

    # Basic Info
    code = models.CharField(
        max_length=100,
        unique=True,
        help_text="Unique form identifier (e.g., 'applicant_info', 'property_details')"
    )
    name = models.CharField(max_length=255, help_text="Form name in English")
    name_fa = models.CharField(max_length=255, help_text="Form name in Persian")
    description = models.TextField(blank=True)

    # Form Number (for backward compatibility)
    form_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Legacy form number (1, 2, 3, etc.)"
    )

    # Version Control
    version = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)

    # Metadata
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_forms'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['form_number', 'code']
        verbose_name = "Dynamic Form"
        verbose_name_plural = "Dynamic Forms"

    def __str__(self):
        return f"{self.code} - {self.name_fa} (v{self.version})"

    def get_schema(self):
        """Get complete form schema with all fields"""
        sections = []

        for form_section in self.sections.all().order_by('order'):
            section_data = {
                'code': form_section.code,
                'name': form_section.name,
                'name_fa': form_section.name_fa,
                'description': form_section.description,
                'order': form_section.order,
                'is_collapsible': form_section.is_collapsible,
                'is_collapsed_default': form_section.is_collapsed_default,
                'fields': []
            }

            for field_mapping in form_section.field_mappings.all().order_by('order'):
                field = field_mapping.field
                field_data = {
                    'code': field.code,
                    'name': field.name,
                    'name_fa': field.name_fa,
                    'field_type': field.field_type,
                    'is_required': field_mapping.is_required or field.is_required,
                    'is_readonly': field_mapping.is_readonly,
                    'is_hidden': field_mapping.is_hidden,
                    'validation': field.get_validation_rules(),
                    'options': field.options,
                    'placeholder': field.placeholder,
                    'placeholder_fa': field.placeholder_fa,
                    'default_value': field_mapping.default_value or field.default_value,
                    'help_text': field.help_text,
                    'help_text_fa': field.help_text_fa,
                    'width': field.width,
                    'data_path': field.data_path or field.code,
                    'is_computed': field.is_computed,
                    'source_fields': field.source_fields,
                    'computation_rule': field.computation_rule,
                }

                section_data['fields'].append(field_data)

            sections.append(section_data)

        return {
            'code': self.code,
            'name': self.name,
            'name_fa': self.name_fa,
            'description': self.description,
            'version': self.version,
            'sections': sections
        }


class FormSection(models.Model):
    """
    Form sections to organize fields
    """
    id = ObjectIdAutoField(primary_key=True)

    form = models.ForeignKey(
        DynamicForm,
        on_delete=models.CASCADE,
        related_name='sections'
    )

    code = models.CharField(max_length=100)
    name = models.CharField(max_length=255)
    name_fa = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    order = models.IntegerField(default=0)

    # UI Properties
    is_collapsible = models.BooleanField(default=False)
    is_collapsed_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('form', 'code')]
        ordering = ['order']
        verbose_name = "Form Section"
        verbose_name_plural = "Form Sections"

    def __str__(self):
        return f"{self.form.code}.{self.code} - {self.name_fa}"


class FormFieldMapping(models.Model):
    """
    Maps fields to form sections with section-specific overrides
    """
    id = ObjectIdAutoField(primary_key=True)

    section = models.ForeignKey(
        FormSection,
        on_delete=models.CASCADE,
        related_name='field_mappings'
    )
    field = models.ForeignKey(
        FormField,
        on_delete=models.PROTECT,
        related_name='form_mappings'
    )

    # Field overrides for this form
    order = models.IntegerField(default=0)
    is_required = models.BooleanField(
        null=True,
        blank=True,
        help_text="Override field's default required setting"
    )
    is_readonly = models.BooleanField(default=False)
    is_hidden = models.BooleanField(default=False)
    default_value = models.CharField(
        max_length=255,
        blank=True,
        help_text="Override field's default value for this form"
    )

    # Conditional display
    show_if_field = models.CharField(
        max_length=100,
        blank=True,
        help_text="Field code that controls visibility"
    )
    show_if_value = models.CharField(
        max_length=255,
        blank=True,
        help_text="Value that triggers visibility"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [('section', 'field')]
        ordering = ['order']
        verbose_name = "Form Field Mapping"
        verbose_name_plural = "Form Field Mappings"

    def __str__(self):
        return f"{self.section.form.code}.{self.section.code}.{self.field.code}"


class FormData(models.Model):
    """
    Stores submitted form data
    Links to workflow for data persistence across forms
    """
    id = ObjectIdAutoField(primary_key=True)

    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.CASCADE,
        related_name='form_submissions'
    )
    form = models.ForeignKey(
        DynamicForm,
        on_delete=models.PROTECT,
        related_name='submissions'
    )

    # Data storage
    data = models.JSONField(
        default=dict,
        help_text="Form field values as {field_code: value}"
    )

    # Submission metadata
    submitted_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='form_submissions'
    )
    submitted_at = models.DateTimeField(auto_now_add=True)

    # Version tracking
    form_version = models.IntegerField()

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = "Form Submission"
        verbose_name_plural = "Form Submissions"
        indexes = [
            models.Index(fields=['workflow', 'form']),
        ]

    def __str__(self):
        return f"{self.workflow.title} - {self.form.code} (v{self.form_version})"

    def get_field_value(self, field_code):
        """Get value for a specific field"""
        return self.data.get(field_code)

    def set_field_value(self, field_code, value):
        """Set value for a specific field"""
        self.data[field_code] = value
