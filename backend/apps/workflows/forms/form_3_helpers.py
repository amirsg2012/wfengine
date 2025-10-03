# apps/workflows/forms/form_3_helpers.py
"""
Form 3 Helper Functions
Uses the centralized permission system but provides Form3-specific convenience methods.
This replaces form_3_permissions.py with a cleaner implementation.
"""
from typing import Dict, List, Any
from apps.permissions.utils import (
    check_form_permission,
    get_editable_fields,
    filter_form_data_by_permissions
)
from apps.permissions.models import PermissionType


class Form3Helper:
    """Helper class for Form3-specific operations using the centralized permission system"""

    # Action descriptions for UI (kept for backward compatibility)
    STEP_DESCRIPTIONS = {
        1: {"action": "fill_legal_report", "description": "تکمیل گزارش حقوقی"},
        2: {"action": "sign_legal_report", "description": "امضاء گزارش حقوقی"},
        3: {"action": "fill_realestate_report", "description": "تکمیل گزارش املاک"},
        4: {"action": "sign_acquisition", "description": "امضاء مدیر تملیک"},
        5: {"action": "sign_realestate", "description": "امضاء معاون املاک"},
        6: {"action": "ceo_approval", "description": "تأیید مدیرعامل"},
        7: {"action": "chairman_approval", "description": "تأیید رئیس هیئت مدیره"}
    }

    # Section to step mapping (for UI convenience)
    SECTION_STEPS = {
        'legalDeputyReport': [1, 2],
        'realEstateDeputyReport': [3, 4, 5],
        'finalApproval': [6, 7]
    }

    @classmethod
    def get_user_permissions(cls, workflow, user, current_step: int) -> Dict[str, Any]:
        """
        Get comprehensive permissions for user in Form3.
        Now uses the centralized permission system.

        Args:
            workflow: Workflow instance
            user: User instance
            current_step: Current step number (1-7)

        Returns:
            Dict with permission information
        """
        from apps.workflows.forms.form_3 import PropertyStatusReviewForm

        # Check if user can view the form at all
        can_view = check_form_permission(
            user, form_number=3, permission_type=PermissionType.VIEW,
            state=workflow.state, workflow=workflow
        )

        # Check if user can edit the form
        can_edit = check_form_permission(
            user, form_number=3, permission_type=PermissionType.EDIT,
            state=workflow.state, workflow=workflow
        )

        # Get editable fields for this user
        editable_field_paths = get_editable_fields(
            user, form_number=3,
            state=workflow.state, workflow=workflow
        )

        # Organize permissions by section
        visible_sections = []
        editable_sections = {}
        editable_fields_by_section = {}

        if can_view:
            # User can see all sections if they have view permission
            visible_sections = ['legalDeputyReport', 'realEstateDeputyReport', 'finalApproval']

            # Determine which sections are editable based on field permissions
            for section in visible_sections:
                section_fields = [
                    path for path in editable_field_paths
                    if path != '*' and path.startswith(f'{section}.')
                ]

                if editable_field_paths == ['*'] or section_fields:
                    editable_sections[section] = True

                    if editable_field_paths == ['*']:
                        # User can edit all fields - get from schema
                        editable_fields_by_section[section] = cls._get_all_fields_in_section(section)
                    else:
                        # User can only edit specific fields
                        editable_fields_by_section[section] = [
                            path.split('.', 1)[1] for path in section_fields
                        ]

        # Check if user can act in current step
        step_info = PropertyStatusReviewForm.APPROVAL_STEPS.get(current_step, {})
        required_role = step_info.get('role')

        from apps.accounts.utils import user_role_codes
        user_roles = user_role_codes(user)
        can_act_in_current_step = required_role in user_roles if required_role else False

        return {
            'visible_sections': visible_sections,
            'editable_sections': editable_sections,
            'editable_fields': editable_fields_by_section,
            'can_act_in_current_step': can_act_in_current_step,
            'next_action': cls.STEP_DESCRIPTIONS.get(current_step, {
                "action": "unknown",
                "description": "نامشخص"
            }),
            'can_view': can_view,
            'can_edit': can_edit,
            'current_step': current_step
        }

    @classmethod
    def _get_all_fields_in_section(cls, section: str) -> List[str]:
        """Get all field names in a section from Form3 schema"""
        from apps.workflows.forms.form_3 import PropertyStatusReviewForm

        schema = PropertyStatusReviewForm.get_schema()
        section_schema = schema.get('properties', {}).get(section, {})

        if section_schema.get('type') == 'object':
            return list(section_schema.get('properties', {}).keys())

        return []

    @classmethod
    def filter_form_data_for_user(cls, form_data: Dict[str, Any], user, workflow) -> Dict[str, Any]:
        """
        Filter form data based on user permissions.
        Now uses the centralized permission system.

        Args:
            form_data: Complete form data
            user: User instance
            workflow: Workflow instance

        Returns:
            Filtered form data
        """
        return filter_form_data_by_permissions(
            user, form_number=3, form_data=form_data,
            state=workflow.state, workflow=workflow,
            permission_type=PermissionType.VIEW
        )

    @classmethod
    def validate_user_form_submission(
        cls,
        form_data: Dict[str, Any],
        user,
        workflow,
        current_step: int
    ) -> Dict[str, Any]:
        """
        Validate that user is only submitting data they have permission to edit.
        Now uses the centralized permission system.

        Args:
            form_data: Submitted form data
            user: User instance
            workflow: Workflow instance
            current_step: Current step number

        Returns:
            Dict of validation errors (empty if valid)
        """
        errors = {}

        # Get user's editable fields
        editable_field_paths = get_editable_fields(
            user, form_number=3,
            state=workflow.state, workflow=workflow
        )

        # If user can edit everything, no validation needed
        if editable_field_paths == ['*']:
            return errors

        # Convert paths to set for quick lookup
        editable_fields_set = set(editable_field_paths)

        # Check each submitted field
        for section, section_data in form_data.items():
            if section in ['formTitle', 'formNumber']:
                continue  # Skip metadata

            if not isinstance(section_data, dict):
                continue

            # Check each field in the section
            for field_name, value in section_data.items():
                if value is None or value == '':
                    continue  # Skip empty fields

                field_path = f"{section}.{field_name}"

                if field_path not in editable_fields_set:
                    errors[field_path] = f"شما مجاز به ویرایش فیلد {field_name} نیستید"

        return errors

    @classmethod
    def get_next_action_description(cls, current_step: int) -> Dict[str, str]:
        """Get action description for current step (UI helper)"""
        return cls.STEP_DESCRIPTIONS.get(current_step, {
            "action": "unknown",
            "description": "نامشخص"
        })

    @classmethod
    def get_section_for_step(cls, step: int) -> str:
        """Get the section name associated with a step"""
        for section, steps in cls.SECTION_STEPS.items():
            if step in steps:
                return section
        return ''
