# apps/workflows/dynamic_form_api.py
"""
API utilities for dynamic forms
Converts database-defined forms to JSON schemas for frontend
"""
from typing import Dict, Any, List
from .models_dynamic_forms import DynamicForm, FormSection, FormField


def get_dynamic_form_schema(form_number: int) -> Dict[str, Any]:
    """
    Get complete form schema for a given form number
    Returns JSON schema compatible with frontend
    """
    try:
        form = DynamicForm.objects.prefetch_related(
            'sections__fields',
            'fields'
        ).get(form_number=form_number, is_active=True)
    except DynamicForm.DoesNotExist:
        return None

    schema = {
        "formNumber": form.form_number,
        "title": form.title_fa,
        "titleEn": form.title_en,
        "description": form.description,
        "hasMultipleSteps": form.has_multiple_steps,
        "totalSteps": form.total_steps,
        "sections": [],
        "fields": []
    }

    # Add sections with their fields
    for section in form.sections.filter(is_active=True).order_by('display_order'):
        section_data = {
            "code": section.code,
            "title": section.title_fa,
            "titleEn": section.title_en,
            "description": section.description,
            "displayOrder": section.display_order,
            "requiredStep": section.required_step,
            "requiresSignature": section.requires_signature,
            "signatureFieldCode": section.signature_field_code,
            "signatureStep": section.signature_step,
            "fields": []
        }

        # Add fields for this section
        for field in section.fields.filter(is_active=True).order_by('display_order'):
            section_data["fields"].append(_field_to_schema(field))

        schema["sections"].append(section_data)

    # Add standalone fields (not in sections)
    for field in form.fields.filter(section__isnull=True, is_active=True).order_by('display_order'):
        schema["fields"].append(_field_to_schema(field))

    return schema


def _field_to_schema(field: FormField) -> Dict[str, Any]:
    """Convert FormField model to JSON schema"""
    field_schema = {
        "code": field.code,
        "label": field.label_fa,
        "labelEn": field.label_en,
        "fieldType": field.field_type,
        "isRequired": field.is_required,
        "placeholder": field.placeholder,
        "helpText": field.help_text,
        "displayOrder": field.display_order,
        "cssClass": field.css_class,
        "defaultValue": field.default_value,
    }

    # Add validation rules
    validation = {}
    if field.min_length:
        validation['minLength'] = field.min_length
    if field.max_length:
        validation['maxLength'] = field.max_length
    if field.min_value is not None:
        validation['minValue'] = field.min_value
    if field.max_value is not None:
        validation['maxValue'] = field.max_value
    if field.regex_pattern:
        validation['pattern'] = field.regex_pattern
    if field.validation_message:
        validation['message'] = field.validation_message

    if validation:
        field_schema['validation'] = validation

    # Add field-specific options
    if field.options_json:
        field_schema['options'] = field.options_json

    return field_schema


def get_form_step_info(form_number: int, workflow) -> Dict[str, Any]:
    """
    Get current step information for multi-step forms
    Returns which sections are accessible at current step
    """
    try:
        form = DynamicForm.objects.get(form_number=form_number, is_active=True)
    except DynamicForm.DoesNotExist:
        return {"error": "Form not found"}

    if not form.has_multiple_steps:
        return {
            "hasMultipleSteps": False,
            "currentStep": 0,
            "totalSteps": 1
        }

    # Get current step from StateStepPermission
    from apps.permissions.models import StateStepPermission
    from apps.workflows.actions import current_step

    current_step_num = current_step(workflow)

    # Get step permission for current step
    step_permission = StateStepPermission.objects.filter(
        state=workflow.current_state.code if hasattr(workflow, 'current_state') else workflow.state,
        step=current_step_num,
        is_active=True
    ).first()

    accessible_sections = []
    if step_permission and step_permission.section:
        # User can access this specific section
        accessible_sections.append({
            "code": step_permission.section,
            "actionType": step_permission.action_type,
            "signatureField": step_permission.signature_field,
            "canEdit": step_permission.action_type == 'FILL',
            "canApprove": step_permission.action_type == 'APPROVE'
        })

    return {
        "hasMultipleSteps": True,
        "currentStep": current_step_num,
        "totalSteps": form.total_steps,
        "accessibleSections": accessible_sections,
        "stepDescription": step_permission.description if step_permission else ""
    }


def validate_form_data(form_number: int, data: Dict[str, Any]) -> Dict[str, List[str]]:
    """
    Validate form data against dynamic form schema
    Returns dict of field codes to error messages
    """
    try:
        form = DynamicForm.objects.prefetch_related('sections__fields', 'fields').get(
            form_number=form_number,
            is_active=True
        )
    except DynamicForm.DoesNotExist:
        return {"_form": ["Form not found"]}

    errors = {}

    # Collect all fields (from sections and standalone)
    all_fields = []

    for section in form.sections.filter(is_active=True):
        for field in section.fields.filter(is_active=True):
            all_fields.append((section.code, field))

    for field in form.fields.filter(section__isnull=True, is_active=True):
        all_fields.append((None, field))

    # Validate each field
    for section_code, field in all_fields:
        field_path = f"{section_code}.{field.code}" if section_code else field.code
        field_value = _get_nested_value(data, field_path)

        # Check required fields
        if field.is_required:
            if field.field_type == 'SIGNATURE':
                # Signature fields should have signatureHash
                if not field_value or not isinstance(field_value, dict) or not field_value.get('signatureHash'):
                    errors[field_path] = f"{field.label_fa} الزامی است"
            elif not field_value:
                errors[field_path] = f"{field.label_fa} الزامی است"

        # Validate field value if present
        if field_value:
            field_errors = _validate_field_value(field, field_value)
            if field_errors:
                errors[field_path] = field_errors

    return errors


def _get_nested_value(data: Dict[str, Any], path: str) -> Any:
    """Get value from nested dict using dot notation path"""
    keys = path.split('.')
    value = data
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            return None
    return value


def _validate_field_value(field: FormField, value: Any) -> str:
    """Validate a single field value"""
    # String length validation
    if isinstance(value, str):
        if field.min_length and len(value) < field.min_length:
            return field.validation_message or f"حداقل طول {field.min_length} کاراکتر"
        if field.max_length and len(value) > field.max_length:
            return field.validation_message or f"حداکثر طول {field.max_length} کاراکتر"

        # Regex validation
        if field.regex_pattern:
            import re
            if not re.match(field.regex_pattern, value):
                return field.validation_message or "فرمت ورودی نامعتبر است"

    # Number validation
    if isinstance(value, (int, float)):
        if field.min_value is not None and value < field.min_value:
            return field.validation_message or f"حداقل مقدار {field.min_value}"
        if field.max_value is not None and value > field.max_value:
            return field.validation_message or f"حداکثر مقدار {field.max_value}"

    return None
