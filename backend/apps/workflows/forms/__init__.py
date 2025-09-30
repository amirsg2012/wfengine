# apps/workflows/forms/__init__.py
"""
Form registration module
Import all forms here to ensure they are registered
"""

from .form_1 import SpecificationsAndDocumentsForm
from .form_2 import ClientUndertakingForm
from .form_3 import PropertyStatusReviewForm  # Add this
from .registry import FormRegistry

# All forms are automatically registered via the @register_form decorator

__all__ = [
    'SpecificationsAndDocumentsForm',
    'ClientUndertakingForm',
    'PropertyStatusReviewForm',  # Add this
    'FormRegistry'
]

# Validate all registered forms on import
def validate_forms():
    """Validate that all registered forms are properly configured"""
    for form_number, form_class in FormRegistry.get_all_forms().items():
        assert hasattr(form_class, 'form_number'), f"Form {form_class} missing form_number"
        assert hasattr(form_class, 'form_title'), f"Form {form_class} missing form_title"
        assert form_class.form_number == form_number, f"Form number mismatch for {form_class}"

# Run validation on import
validate_forms()