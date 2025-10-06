# apps/permissions/utils_simplified.py
"""
Simplified permission utilities - State-Step based only.

Core principle: If you can approve a step, you can also fill/edit its form/section.
"""
from typing import Set, Optional, List
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


def get_user_roles(user) -> Set[str]:
    """Get all role codes for a user"""
    if not user or not user.is_authenticated:
        return set()
    return set(user.memberships.values_list('role__code', flat=True))


def can_user_approve_step(user, workflow, step_number: int) -> bool:
    """
    Check if user can approve a specific step in the workflow's current state.

    Args:
        user: User instance
        workflow: Workflow instance
        step_number: Step number (0-based)

    Returns:
        bool: True if user can approve this step
    """
    # Superusers have all permissions
    if user.is_superuser:
        return True

    from .models_simplified import WorkflowState, WorkflowStateStep, StepPermissionOverride

    # Get current workflow state
    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
    except WorkflowState.DoesNotExist:
        return False

    # Get the step
    try:
        step = state.steps.get(step_number=step_number, is_active=True)
    except WorkflowStateStep.DoesNotExist:
        return False

    # Check for permission override
    if has_step_override(user, workflow, step):
        return True

    # Check if user can approve this step
    return step.can_user_approve(user)


def can_user_edit_step(user, workflow, step_number: int) -> bool:
    """
    Check if user can edit/fill a specific step.
    In simplified model: if you can approve, you can edit.

    Args:
        user: User instance
        workflow: Workflow instance
        step_number: Step number (0-based)

    Returns:
        bool: True if user can edit this step
    """
    return can_user_approve_step(user, workflow, step_number)


def can_user_view_workflow(user, workflow) -> bool:
    """
    Check if user can view a workflow.
    Default: All authenticated users with roles can view.

    Args:
        user: User instance
        workflow: Workflow instance

    Returns:
        bool: True if user can view
    """
    if user.is_superuser:
        return True

    # All users with roles can view workflows
    user_roles = get_user_roles(user)
    return bool(user_roles)


def get_current_step_number(workflow) -> int:
    """
    Get the current step number for a workflow.

    Returns:
        int: Current step number (0-based), or total steps if all completed
    """
    from .models_simplified import WorkflowState, WorkflowStepCompletion

    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
    except WorkflowState.DoesNotExist:
        return 0

    total_steps = state.steps.filter(is_active=True).count()

    if total_steps == 0:
        return 0

    # Check each step to find first incomplete one
    for step_num in range(total_steps):
        step = state.steps.get(step_number=step_num, is_active=True)

        if step.requires_all_approvers:
            # All assigned roles must approve
            required_count = step.step_permissions.filter(is_active=True).count()
            completed_count = WorkflowStepCompletion.objects.filter(
                workflow=workflow,
                step=step
            ).count()

            if completed_count < required_count:
                return step_num
        else:
            # Any one role can approve (parallel)
            if not WorkflowStepCompletion.objects.filter(
                workflow=workflow,
                step=step
            ).exists():
                return step_num

    # All steps completed
    return total_steps


def get_required_steps_count(workflow) -> int:
    """
    Get total number of steps required for workflow's current state.

    Args:
        workflow: Workflow instance

    Returns:
        int: Total number of steps
    """
    from .models_simplified import WorkflowState

    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
        return state.steps.filter(is_active=True).count()
    except WorkflowState.DoesNotExist:
        return 0


def is_step_completed(workflow, step_number: int) -> bool:
    """
    Check if a step is completed.

    Args:
        workflow: Workflow instance
        step_number: Step number (0-based)

    Returns:
        bool: True if step is completed
    """
    from .models_simplified import WorkflowState, WorkflowStepCompletion

    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
        step = state.steps.get(step_number=step_number, is_active=True)
    except (WorkflowState.DoesNotExist, WorkflowState.DoesNotExist):
        return False

    if step.requires_all_approvers:
        # All assigned roles must approve
        required_count = step.step_permissions.filter(is_active=True).count()
        completed_count = WorkflowStepCompletion.objects.filter(
            workflow=workflow,
            step=step
        ).count()
        return completed_count >= required_count
    else:
        # Any one approval is enough
        return WorkflowStepCompletion.objects.filter(
            workflow=workflow,
            step=step
        ).exists()


def complete_step(workflow, step_number: int, user, role_code: str = None, data_snapshot: dict = None) -> bool:
    """
    Mark a step as completed.

    Args:
        workflow: Workflow instance
        step_number: Step number (0-based)
        user: User completing the step
        role_code: Role code used for completion
        data_snapshot: Optional snapshot of form data

    Returns:
        bool: True if successfully completed
    """
    from .models_simplified import WorkflowState, WorkflowStepCompletion
    from django.db import IntegrityError

    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
        step = state.steps.get(step_number=step_number, is_active=True)
    except (WorkflowState.DoesNotExist, WorkflowState.DoesNotExist):
        return False

    # Check if user can approve this step
    if not can_user_approve_step(user, workflow, step_number):
        return False

    # Check if already completed (for non-requires_all_approvers)
    if not step.requires_all_approvers:
        if is_step_completed(workflow, step_number):
            return False  # Already completed by someone else

    # Create completion record
    try:
        WorkflowStepCompletion.objects.create(
            workflow=workflow,
            step=step,
            completed_by=user,
            role_code=role_code,
            data_snapshot=data_snapshot
        )
        return True
    except IntegrityError:
        # Already completed by this user
        return False


def get_editable_sections(user, workflow) -> List[str]:
    """
    Get list of form sections user can edit in current workflow state.

    Args:
        user: User instance
        workflow: Workflow instance

    Returns:
        List of section codes user can edit
    """
    from .models_simplified import WorkflowState

    if user.is_superuser:
        return ['*']  # All sections

    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
    except WorkflowState.DoesNotExist:
        return []

    user_roles = get_user_roles(user)
    if not user_roles:
        return []

    editable_sections = []
    current_step = get_current_step_number(workflow)

    # User can edit current step and any incomplete steps they have permission for
    for step in state.steps.filter(is_active=True, step_number__gte=current_step):
        if step.can_user_approve(user):
            # If step has a form_section, add it
            if state.form_section:
                editable_sections.append(state.form_section)
            elif step.step_number == current_step:
                # Current step - can edit
                editable_sections.append(f"step_{step.step_number}")

    return editable_sections


def get_step_info(workflow, step_number: int) -> dict:
    """
    Get information about a specific step.

    Args:
        workflow: Workflow instance
        step_number: Step number (0-based)

    Returns:
        dict: Step information
    """
    from .models_simplified import WorkflowState

    try:
        state = WorkflowState.objects.get(code=workflow.state, is_active=True)
        step = state.steps.get(step_number=step_number, is_active=True)
    except (WorkflowState.DoesNotExist, WorkflowState.DoesNotExist):
        return {}

    return {
        'step_number': step.step_number,
        'name_en': step.name_en,
        'name_fa': step.name_fa,
        'description_fa': step.description_fa,
        'action_type': step.action_type,
        'signature_field': step.signature_field,
        'requires_all_approvers': step.requires_all_approvers,
        'required_roles': step.get_required_roles(),
        'is_completed': is_step_completed(workflow, step_number),
    }


def has_step_override(user, workflow, step) -> bool:
    """
    Check if user has a permission override for a specific step.

    Args:
        user: User instance
        workflow: Workflow instance
        step: WorkflowStateStep instance

    Returns:
        bool: True if user has valid override
    """
    from .models_simplified import StepPermissionOverride

    overrides = StepPermissionOverride.objects.filter(
        workflow=workflow,
        user=user,
        step=step,
        is_active=True
    )

    for override in overrides:
        if override.is_valid():
            return True

    return False


def get_workflows_pending_user_action(user) -> List:
    """
    Get all workflows where user can perform the next required action.

    Args:
        user: User instance

    Returns:
        List of workflow instances
    """
    from apps.workflows.models import Workflow
    from .models_simplified import WorkflowState

    if not user or not user.is_authenticated:
        return []

    user_roles = get_user_roles(user)
    if not user_roles and not user.is_superuser:
        return []

    pending = []

    # Get all active workflows not in terminal state
    for workflow in Workflow.objects.exclude(state="Settlment"):
        current_step = get_current_step_number(workflow)
        total_steps = get_required_steps_count(workflow)

        # Skip if all steps completed
        if current_step >= total_steps:
            continue

        # Check if user can approve current step
        if can_user_approve_step(user, workflow, current_step):
            pending.append(workflow)

    return pending


def filter_form_data_by_permissions(user, workflow, form_data: dict) -> dict:
    """
    Filter form data based on user's step permissions.
    In simplified model: user can view all data, but edit only their step sections.

    Args:
        user: User instance
        workflow: Workflow instance
        form_data: Complete form data dict

    Returns:
        Filtered form data dict
    """
    if user.is_superuser:
        return form_data

    # For viewing: all users can see all data
    # For editing: controlled by get_editable_sections()
    return form_data
