# apps/workflows/forms/registry.py
from typing import Any, Dict, Type, Optional
from .base import BaseWorkflowForm

class FormRegistry:
    """
    Registry for all workflow forms

    Supports both legacy hardcoded forms and new dynamic forms.
    Will gradually transition to dynamic forms only.
    """

    _forms: Dict[int, Type[BaseWorkflowForm]] = {}
    _use_dynamic_forms = True  # Set to True to prefer dynamic forms over legacy

    @classmethod
    def register(cls, form_class: Type[BaseWorkflowForm]):
        """Register a legacy form class"""
        cls._forms[form_class.form_number] = form_class
        return form_class

    @classmethod
    def get_form(cls, form_number: int) -> Optional[Type[BaseWorkflowForm]]:
        """
        Get form class by number

        If use_dynamic_forms is True, returns None (forms should use DynamicForm API)
        Otherwise returns legacy form class
        """
        if cls._use_dynamic_forms:
            # Dynamic forms are now the default
            # Legacy forms still available for backward compatibility
            return None
        return cls._forms.get(form_number)

    @classmethod
    def get_legacy_form(cls, form_number: int) -> Optional[Type[BaseWorkflowForm]]:
        """Get legacy form class by number (bypass dynamic forms preference)"""
        return cls._forms.get(form_number)

    @classmethod
    def get_all_forms(cls) -> Dict[int, Type[BaseWorkflowForm]]:
        """Get all registered legacy forms"""
        return cls._forms.copy()

    @classmethod
    def get_form_schema(cls, form_number: int) -> Optional[Dict[str, Any]]:
        """
        Get form schema by number

        If use_dynamic_forms is True, returns None (use DynamicForm.get_schema() instead)
        Otherwise returns legacy form schema
        """
        if cls._use_dynamic_forms:
            # Use DynamicForm API instead
            from apps.forms.models import DynamicForm
            try:
                dynamic_form = DynamicForm.objects.get(form_number=form_number, is_active=True)
                return dynamic_form.get_schema()
            except DynamicForm.DoesNotExist:
                # Fallback to legacy form
                form_class = cls._forms.get(form_number)
                return form_class.get_schema() if form_class else None

        form_class = cls.get_form(form_number)
        return form_class.get_schema() if form_class else None

    @classmethod
    def set_dynamic_forms_enabled(cls, enabled: bool):
        """Enable or disable dynamic forms (for testing/migration)"""
        cls._use_dynamic_forms = enabled

    @classmethod
    def is_using_dynamic_forms(cls) -> bool:
        """Check if dynamic forms are enabled"""
        return cls._use_dynamic_forms


# Decorator for easy registration
def register_form(form_class: Type[BaseWorkflowForm]):
    """Decorator to register a legacy form"""
    return FormRegistry.register(form_class)