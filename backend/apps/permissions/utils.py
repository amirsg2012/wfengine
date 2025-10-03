# apps/permissions/utils.py
"""
Utility functions for checking permissions
"""
from typing import List, Optional, Set
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import models
from .models import (
    StatePermission,
    StateStepPermission,
    FormPermission,
    FormFieldPermission,
    PermissionOverride,
    PermissionType
)

User = get_user_model()


def get_user_roles(user) -> Set[str]:
    """Get all role codes for a user"""
    from apps.accounts.utils import user_role_codes
    return set(user_role_codes(user))


def check_state_permission(
    user,
    workflow,
    permission_type: str,
    check_override: bool = True
) -> bool:
    """
    Check if user has permission for a workflow state.

    Args:
        user: User instance
        workflow: Workflow instance
        permission_type: Type of permission (VIEW, EDIT, APPROVE, TRANSITION, DELETE)
        check_override: Whether to check for permission overrides

    Returns:
        bool: True if user has permission
    """
    # Superusers have all permissions
    if user.is_superuser:
        return True

    # Check workflow-specific overrides first
    if check_override:
        if has_permission_override(user, workflow, permission_type):
            return True

    state = workflow.state
    user_roles = get_user_roles(user)

    # Check user-specific permissions
    user_perms = StatePermission.objects.filter(
        state=state,
        permission_type=permission_type,
        user=user,
        is_active=True
    )

    for perm in user_perms:
        if perm.restrict_to_own:
            if workflow.created_by == user:
                return True
        else:
            return True

    # Check role-based permissions
    if user_roles:
        role_perms = StatePermission.objects.filter(
            state=state,
            permission_type=permission_type,
            role__code__in=user_roles,
            is_active=True
        )

        for perm in role_perms:
            if perm.restrict_to_own:
                if workflow.created_by == user:
                    return True
            else:
                return True

    return False


def check_state_step_permission(
    user,
    workflow,
    step: int
) -> bool:
    """
    Check if user can approve a specific step in a workflow state.

    Args:
        user: User instance
        workflow: Workflow instance
        step: Step index (0-based)

    Returns:
        bool: True if user can approve this step
    """
    # Superusers can approve any step
    if user.is_superuser:
        return True

    state = workflow.state
    user_roles = get_user_roles(user)

    # Check user-specific step permissions
    if StateStepPermission.objects.filter(
        state=state,
        step=step,
        user=user,
        is_active=True
    ).exists():
        return True

    # Check role-based step permissions
    if user_roles:
        if StateStepPermission.objects.filter(
            state=state,
            step=step,
            role__code__in=user_roles,
            is_active=True
        ).exists():
            return True

    return False


def check_form_permission(
    user,
    form_number: int,
    permission_type: str,
    state: Optional[str] = None,
    workflow = None
) -> bool:
    """
    Check if user has permission for a form.

    Args:
        user: User instance
        form_number: Form number
        permission_type: Type of permission (VIEW, EDIT)
        state: Optional workflow state
        workflow: Optional workflow instance for override checks

    Returns:
        bool: True if user has permission
    """
    # Superusers have all permissions
    if user.is_superuser:
        return True

    # Check workflow-specific overrides
    if workflow:
        if has_permission_override(user, workflow, permission_type, form_number=form_number):
            return True

    user_roles = get_user_roles(user)

    # Build query filters
    filters = {
        'form_number': form_number,
        'permission_type': permission_type,
        'is_active': True
    }

    # Check user-specific permissions
    user_perms = FormPermission.objects.filter(user=user, **filters)
    if state:
        user_perms = user_perms.filter(state__in=[state, None])

    if user_perms.exists():
        return True

    # Check role-based permissions
    if user_roles:
        role_perms = FormPermission.objects.filter(role__code__in=user_roles, **filters)
        if state:
            role_perms = role_perms.filter(state__in=[state, None])

        if role_perms.exists():
            return True

    return False


def check_form_field_permission(
    user,
    form_number: int,
    field_path: str,
    permission_type: str,
    state: Optional[str] = None,
    workflow = None
) -> bool:
    """
    Check if user has permission for a specific form field.

    Args:
        user: User instance
        form_number: Form number
        field_path: JSON path to field (e.g., 'personalInformation.firstName')
        permission_type: Type of permission (VIEW, EDIT)
        state: Optional workflow state
        workflow: Optional workflow instance for override checks

    Returns:
        bool: True if user has permission
    """
    # Superusers have all permissions
    if user.is_superuser:
        return True

    # Check workflow-specific overrides
    if workflow:
        if has_permission_override(
            user, workflow, permission_type,
            form_number=form_number, field_path=field_path
        ):
            return True

    user_roles = get_user_roles(user)

    # Build query filters
    filters = {
        'form_number': form_number,
        'field_path': field_path,
        'permission_type': permission_type,
        'is_active': True
    }

    # Check user-specific permissions
    user_perms = FormFieldPermission.objects.filter(user=user, **filters)
    if state:
        user_perms = user_perms.filter(state__in=[state, None])

    if user_perms.exists():
        return True

    # Check role-based permissions
    if user_roles:
        role_perms = FormFieldPermission.objects.filter(role__code__in=user_roles, **filters)
        if state:
            role_perms = role_perms.filter(state__in=[state, None])

        if role_perms.exists():
            return True

    return False


def has_permission_override(
    user,
    workflow,
    permission_type: str,
    form_number: Optional[int] = None,
    field_path: Optional[str] = None
) -> bool:
    """
    Check if user has a permission override for a workflow.

    Args:
        user: User instance
        workflow: Workflow instance
        permission_type: Type of permission
        form_number: Optional form number
        field_path: Optional field path

    Returns:
        bool: True if user has valid override
    """
    filters = {
        'workflow': workflow,
        'user': user,
        'permission_type': permission_type,
        'is_active': True
    }

    if form_number is not None:
        filters['form_number'] = form_number

    if field_path is not None:
        filters['field_path'] = field_path

    overrides = PermissionOverride.objects.filter(**filters)

    for override in overrides:
        if override.is_valid():
            return True

    return False


def get_editable_fields(
    user,
    form_number: int,
    state: Optional[str] = None,
    workflow = None
) -> List[str]:
    """
    Get list of fields user can edit in a form.

    Args:
        user: User instance
        form_number: Form number
        state: Optional workflow state
        workflow: Optional workflow instance

    Returns:
        List of field paths user can edit
    """
    if user.is_superuser:
        # Return all fields - you might want to get this from form schema
        return ['*']

    user_roles = get_user_roles(user)
    editable_fields = set()

    # Check field-specific permissions
    filters = {
        'form_number': form_number,
        'permission_type': PermissionType.EDIT,
        'is_active': True
    }

    # User-specific permissions
    user_field_perms = FormFieldPermission.objects.filter(user=user, **filters)
    if state:
        user_field_perms = user_field_perms.filter(state__in=[state, None])

    for perm in user_field_perms:
        editable_fields.add(perm.field_path)

    # Role-based permissions
    if user_roles:
        role_field_perms = FormFieldPermission.objects.filter(
            role__code__in=user_roles,
            **filters
        )
        if state:
            role_field_perms = role_field_perms.filter(state__in=[state, None])

        for perm in role_field_perms:
            editable_fields.add(perm.field_path)

    # Check if user has form-level edit permission (grants access to all fields)
    if check_form_permission(user, form_number, PermissionType.EDIT, state, workflow):
        # If no specific field permissions, allow all fields
        if not editable_fields:
            return ['*']

    return list(editable_fields)


def filter_form_data_by_permissions(
    user,
    form_number: int,
    form_data: dict,
    state: Optional[str] = None,
    workflow = None,
    permission_type: str = PermissionType.VIEW
) -> dict:
    """
    Filter form data based on user permissions.
    Returns only the fields user has permission to see/edit.

    Args:
        user: User instance
        form_number: Form number
        form_data: Complete form data dict
        state: Optional workflow state
        workflow: Optional workflow instance
        permission_type: VIEW or EDIT

    Returns:
        Filtered form data dict
    """
    if user.is_superuser:
        return form_data

    # Check if user has form-level permission
    if check_form_permission(user, form_number, permission_type, state, workflow):
        # Check if there are any field-level restrictions
        user_roles = get_user_roles(user)

        # If no field-level permissions exist, return all data
        has_field_perms = FormFieldPermission.objects.filter(
            form_number=form_number,
            permission_type=permission_type,
            is_active=True
        ).filter(
            models.Q(user=user) | models.Q(role__code__in=user_roles)
        ).exists()

        if not has_field_perms:
            return form_data

    # Get allowed fields
    allowed_fields = []
    user_roles = get_user_roles(user)

    field_perms = FormFieldPermission.objects.filter(
        form_number=form_number,
        permission_type=permission_type,
        is_active=True
    )

    if state:
        field_perms = field_perms.filter(state__in=[state, None])

    # Get user and role permissions
    field_perms = field_perms.filter(
        models.Q(user=user) | models.Q(role__code__in=user_roles)
    )

    allowed_fields = [perm.field_path for perm in field_perms]

    if not allowed_fields:
        return {}

    # Filter form data
    filtered_data = {}
    for field_path in allowed_fields:
        # Navigate nested dict structure
        keys = field_path.split('.')
        value = form_data

        try:
            for key in keys:
                value = value[key]

            # Reconstruct nested structure
            current = filtered_data
            for key in keys[:-1]:
                if key not in current:
                    current[key] = {}
                current = current[key]
            current[keys[-1]] = value
        except (KeyError, TypeError):
            # Field doesn't exist in data
            continue

    return filtered_data
