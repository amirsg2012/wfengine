# apps/workflows/models_dynamic_forms.py
"""
Dynamic Form System - Admin configurable forms
Replaces hardcoded form definitions with database-driven forms
"""
from django.db import models
from django_mongodb_backend.fields import ObjectIdAutoField
import json


class FieldType(models.TextChoices):
    """Field types for dynamic forms"""
    TEXT = "TEXT", "Text"
    TEXTAREA = "TEXTAREA", "Text Area"
    NUMBER = "NUMBER", "Number"
    EMAIL = "EMAIL", "Email"
    PHONE = "PHONE", "Phone"
    DATE = "DATE", "Date"
    DATETIME = "DATETIME", "Date & Time"
    BOOLEAN = "BOOLEAN", "Checkbox"
    SELECT = "SELECT", "Dropdown"
    RADIO = "RADIO", "Radio Button"
    FILE = "FILE", "File Upload"
    SIGNATURE = "SIGNATURE", "Digital Signature"
    SECTION_HEADER = "SECTION_HEADER", "Section Header"


class DynamicForm(models.Model):
    """
    Dynamic form definition - replaces hardcoded forms
    Can be created and configured entirely from Django admin
    """
    _id = ObjectIdAutoField(primary_key=True)

    form_number = models.IntegerField(unique=True, help_text="Unique form number")
    title_en = models.CharField(max_length=255, help_text="Form title in English")
    title_fa = models.CharField(max_length=255, help_text="Form title in Persian")

    # Link to workflow state
    state = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Workflow state this form belongs to (optional)"
    )

    # Multi-step configuration
    has_multiple_steps = models.BooleanField(
        default=False,
        help_text="If true, this form has multiple approval/fill steps"
    )
    total_steps = models.IntegerField(
        default=1,
        help_text="Total number of steps if multi-step form"
    )

    # Form metadata
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    display_order = models.IntegerField(default=0, help_text="Order in workflow sequence")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'form_number']
        verbose_name = "Dynamic Form"
        verbose_name_plural = "Dynamic Forms"

    def __str__(self):
        return f"Form {self.form_number}: {self.title_fa}"


class FormSection(models.Model):
    """
    Form sections - for organizing fields into logical groups
    Critical for Form 3 style multi-section, multi-role workflows
    """
    _id = ObjectIdAutoField(primary_key=True)

    form = models.ForeignKey(
        DynamicForm,
        on_delete=models.CASCADE,
        related_name='sections'
    )

    code = models.CharField(
        max_length=128,
        help_text="Machine-readable section code (e.g., 'legalDeputyReport')"
    )
    title_en = models.CharField(max_length=255)
    title_fa = models.CharField(max_length=255)

    # Section visibility and permissions
    display_order = models.IntegerField(default=0)
    description = models.TextField(blank=True)

    # Step association - which step can fill/approve this section
    required_step = models.IntegerField(
        null=True,
        blank=True,
        help_text="Step number required to access this section (for multi-step forms)"
    )

    # Signature configuration
    requires_signature = models.BooleanField(
        default=False,
        help_text="Does this section require a signature?"
    )
    signature_field_code = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        help_text="Field code for signature (e.g., 'managerSignature')"
    )
    signature_step = models.IntegerField(
        null=True,
        blank=True,
        help_text="Step number for signature approval"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['form', 'display_order']
        unique_together = [('form', 'code')]
        verbose_name = "Form Section"
        verbose_name_plural = "Form Sections"

    def __str__(self):
        return f"{self.form.title_fa} - {self.title_fa}"


class FormField(models.Model):
    """
    Individual form fields - fully configurable from admin
    """
    _id = ObjectIdAutoField(primary_key=True)

    section = models.ForeignKey(
        FormSection,
        on_delete=models.CASCADE,
        related_name='fields',
        null=True,
        blank=True,
        help_text="Section this field belongs to (optional)"
    )
    form = models.ForeignKey(
        DynamicForm,
        on_delete=models.CASCADE,
        related_name='fields',
        help_text="Parent form (required if no section)"
    )

    # Field identification
    code = models.CharField(
        max_length=128,
        help_text="Machine-readable field code (e.g., 'firstName')"
    )
    label_en = models.CharField(max_length=255, help_text="Field label in English")
    label_fa = models.CharField(max_length=255, help_text="Field label in Persian")

    # Field configuration
    field_type = models.CharField(
        max_length=32,
        choices=FieldType.choices,
        default=FieldType.TEXT
    )

    # Validation
    is_required = models.BooleanField(default=False)
    placeholder = models.CharField(max_length=255, blank=True)
    help_text = models.CharField(max_length=500, blank=True)

    # Field-specific options
    options_json = models.JSONField(
        null=True,
        blank=True,
        help_text="JSON configuration for field (e.g., dropdown options, validation rules)"
    )

    # Validation rules
    min_length = models.IntegerField(null=True, blank=True)
    max_length = models.IntegerField(null=True, blank=True)
    min_value = models.FloatField(null=True, blank=True)
    max_value = models.FloatField(null=True, blank=True)
    regex_pattern = models.CharField(
        max_length=500,
        blank=True,
        help_text="Regex validation pattern"
    )
    validation_message = models.CharField(
        max_length=255,
        blank=True,
        help_text="Custom validation error message"
    )

    # Display
    display_order = models.IntegerField(default=0)
    css_class = models.CharField(max_length=255, blank=True, help_text="CSS classes for styling")

    # Default value
    default_value = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['form', 'section', 'display_order']
        verbose_name = "Form Field"
        verbose_name_plural = "Form Fields"

    def __str__(self):
        section_info = f" ({self.section.title_fa})" if self.section else ""
        return f"{self.form.title_fa}{section_info} - {self.label_fa}"

    def get_field_path(self):
        """Get JSON path for this field"""
        if self.section:
            return f"{self.section.code}.{self.code}"
        return self.code

    def get_validation_schema(self):
        """Generate validation schema for this field"""
        schema = {
            'type': self.field_type,
            'required': self.is_required,
            'label': self.label_fa,
        }

        if self.min_length:
            schema['minLength'] = self.min_length
        if self.max_length:
            schema['maxLength'] = self.max_length
        if self.min_value is not None:
            schema['minValue'] = self.min_value
        if self.max_value is not None:
            schema['maxValue'] = self.max_value
        if self.regex_pattern:
            schema['pattern'] = self.regex_pattern
        if self.validation_message:
            schema['message'] = self.validation_message
        if self.options_json:
            schema['options'] = self.options_json

        return schema
