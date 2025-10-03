# backend/api/permissions/workflow_permissions.py
"""
DRF Permission classes for workflow-related endpoints
"""
from rest_framework import permissions
from apps.permissions.utils import (
    check_state_permission,
    check_state_step_permission,
    check_form_permission,
    check_form_field_permission
)
from apps.permissions.models import PermissionType


class WorkflowPermission(permissions.BasePermission):
    """
    Permission class for workflow operations.
    Checks state-level permissions.
    """

    def has_permission(self, request, view):
        """Check if user can access workflows in general"""
        # All authenticated users can list/create workflows
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user can access specific workflow"""
        user = request.user

        # Map HTTP methods to permission types
        if request.method in permissions.SAFE_METHODS:
            # GET, HEAD, OPTIONS
            return check_state_permission(user, obj, PermissionType.VIEW)
        elif request.method in ['PUT', 'PATCH']:
            # Edit permissions
            return check_state_permission(user, obj, PermissionType.EDIT)
        elif request.method == 'DELETE':
            # Delete permissions
            return check_state_permission(user, obj, PermissionType.DELETE)
        elif request.method == 'POST':
            # For custom actions, check in the view
            return True

        return False


class WorkflowApprovalPermission(permissions.BasePermission):
    """
    Permission class for workflow approval actions.
    Checks step-level permissions.
    """

    def has_object_permission(self, request, view, obj):
        """Check if user can approve workflow at current step"""
        user = request.user

        # Must have APPROVE permission for the state
        if not check_state_permission(user, obj, PermissionType.APPROVE):
            return False

        # Check step-specific permissions
        from apps.workflows.actions import current_step
        step = current_step(obj)

        return check_state_step_permission(user, obj, step)


class WorkflowTransitionPermission(permissions.BasePermission):
    """
    Permission class for workflow state transitions.
    """

    def has_object_permission(self, request, view, obj):
        """Check if user can transition workflow to next state"""
        user = request.user

        return check_state_permission(user, obj, PermissionType.TRANSITION)


class WorkflowFormPermission(permissions.BasePermission):
    """
    Permission class for workflow form operations.
    Checks form-level permissions.
    """

    def has_permission(self, request, view):
        """Check if user can access forms in general"""
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        """Check if user can access specific workflow's form"""
        user = request.user
        workflow = obj

        # Get form number from request
        form_number = request.data.get('form_number') or request.query_params.get('form_number')

        if not form_number:
            # If no form number specified, check workflow-level permission
            if request.method in permissions.SAFE_METHODS:
                return check_state_permission(user, workflow, PermissionType.VIEW)
            else:
                return check_state_permission(user, workflow, PermissionType.EDIT)

        # Check form-specific permission
        try:
            form_number = int(form_number)
        except (ValueError, TypeError):
            return False

        if request.method in permissions.SAFE_METHODS:
            return check_form_permission(
                user, form_number, PermissionType.VIEW,
                state=workflow.state, workflow=workflow
            )
        else:
            return check_form_permission(
                user, form_number, PermissionType.EDIT,
                state=workflow.state, workflow=workflow
            )


class IsWorkflowOwnerOrReadOnly(permissions.BasePermission):
    """
    Permission class that allows owners to edit, others to read only.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions for all authenticated users
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for owner
        return obj.created_by == request.user


class CanViewWorkflow(permissions.BasePermission):
    """Simple permission to check VIEW access"""

    def has_object_permission(self, request, view, obj):
        return check_state_permission(request.user, obj, PermissionType.VIEW)


class CanEditWorkflow(permissions.BasePermission):
    """Simple permission to check EDIT access"""

    def has_object_permission(self, request, view, obj):
        return check_state_permission(request.user, obj, PermissionType.EDIT)


class CanApproveWorkflow(permissions.BasePermission):
    """Simple permission to check APPROVE access"""

    def has_object_permission(self, request, view, obj):
        return check_state_permission(request.user, obj, PermissionType.APPROVE)


class CanTransitionWorkflow(permissions.BasePermission):
    """Simple permission to check TRANSITION access"""

    def has_object_permission(self, request, view, obj):
        return check_state_permission(request.user, obj, PermissionType.TRANSITION)


class CanDeleteWorkflow(permissions.BasePermission):
    """Simple permission to check DELETE access"""

    def has_object_permission(self, request, view, obj):
        return check_state_permission(request.user, obj, PermissionType.DELETE)
