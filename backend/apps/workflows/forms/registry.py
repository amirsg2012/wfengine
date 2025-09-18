# apps/workflows/forms/registry.py
from typing import Any, Dict, Type, Optional
from .base import BaseWorkflowForm

class FormRegistry:
    """Registry for all workflow forms"""
    
    _forms: Dict[int, Type[BaseWorkflowForm]] = {}
    
    @classmethod
    def register(cls, form_class: Type[BaseWorkflowForm]):
        """Register a form class"""
        cls._forms[form_class.form_number] = form_class
        return form_class
    
    @classmethod
    def get_form(cls, form_number: int) -> Optional[Type[BaseWorkflowForm]]:
        """Get form class by number"""
        return cls._forms.get(form_number)
    
    @classmethod
    def get_all_forms(cls) -> Dict[int, Type[BaseWorkflowForm]]:
        """Get all registered forms"""
        return cls._forms.copy()
    
    @classmethod
    def get_form_schema(cls, form_number: int) -> Optional[Dict[str, Any]]:
        """Get form schema by number"""
        form_class = cls.get_form(form_number)
        return form_class.get_schema() if form_class else None


# Decorator for easy registration
def register_form(form_class: Type[BaseWorkflowForm]):
    """Decorator to register a form"""
    return FormRegistry.register(form_class)