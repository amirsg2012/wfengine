# apps/workflows/actions_simplified.py
"""
Simplified workflow action handlers using state-step based permissions.

Key principles:
1. All actions are state-step based
2. If you can approve a step, you can fill/edit its form/section
3. Multiple approvers for same step = parallel approval
"""
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from apps.permissions.utils_simplified import (
    can_user_approve_step,
    get_current_step_number,
    get_required_steps_count,
    is_step_completed,
    complete_step,
    get_step_info,
)

User = get_user_model()


def current_step(workflow) -> int:
    """
    Return next required approval step index for the workflow's current state.

    Args:
        workflow: Workflow instance

    Returns:
        int: Current step number (0-based)
    """
    if not workflow.pk:
        return 0

    return get_current_step_number(workflow)


def steps_required(workflow) -> int:
    """
    Return total number of steps required for current workflow state.

    Args:
        workflow: Workflow instance

    Returns:
        int: Total number of steps
    """
    return get_required_steps_count(workflow)


def step_roles(workflow, step_idx: int) -> list[str]:
    """
    Return list of roles that can satisfy a given step in workflow state.

    Args:
        workflow: Workflow instance
        step_idx: Step index (0-based)

    Returns:
        list: List of role codes
    """
    step_info = get_step_info(workflow, step_idx)
    return step_info.get('required_roles', [])


def can_user_satisfy_step(user, workflow, step_idx: int) -> bool:
    """
    Check if user has required permission to satisfy a given step.

    Args:
        user: User instance
        workflow: Workflow instance
        step_idx: Step index (0-based)

    Returns:
        bool: True if user can approve this step
    """
    return can_user_approve_step(user, workflow, step_idx)


def actions_ok(workflow) -> bool:
    """
    Condition check for FSM transitions.
    Returns True if all required steps are completed.

    Args:
        workflow: Workflow instance

    Returns:
        bool: True if can advance to next state
    """
    if not workflow.pk:
        return False

    current = current_step(workflow)
    required = steps_required(workflow)

    return current >= required


def get_workflows_pending_user_action(user) -> list:
    """
    Get all workflows where the user can perform the next required action.

    Args:
        user: User instance

    Returns:
        list: List of workflow instances
    """
    from apps.permissions.utils_simplified import get_workflows_pending_user_action as get_pending

    return get_pending(user)


def perform_action(workflow, user, action_type: str, data: dict = None) -> dict:
    """
    Perform an action on the workflow.

    Args:
        workflow: Workflow instance
        user: User performing the action
        action_type: Type of action ('APPROVE', 'COMMENT', etc.)
        data: Optional data for the action

    Returns:
        dict: Result with flags for the caller
            - done: bool - Whether all steps are completed
            - state: str - Current state
            - next_step: int - Next step number (if not done)
            - error: str - Error code if failed
            - message: str - Error message
    """
    from .models import Action

    # Validate action_type
    if not action_type:
        return {"error": "invalid_action", "message": "Action type cannot be empty or None"}

    valid_action_types = [choice[0] for choice in Action.ActionType.choices]
    if action_type not in valid_action_types:
        return {
            "error": "invalid_action",
            "message": f"Invalid action type: '{action_type}'. Valid types are: {valid_action_types}"
        }

    if action_type == Action.ActionType.APPROVE:
        state = workflow.state
        total = steps_required(workflow)
        idx = current_step(workflow)

        # Check if all steps already completed
        if idx >= total:
            return {"done": True, "state": state, "next_step": None}

        # Check if user can approve this step
        if not can_user_satisfy_step(user, workflow, idx):
            return {
                "error": "forbidden",
                "needed_roles": step_roles(workflow, idx),
                "message": f"User does not have required role for step {idx}"
            }

        # Get user's role for this approval
        user_roles = set(user.memberships.values_list('role__code', flat=True))
        required_roles = set(step_roles(workflow, idx))
        role_intersection = list(user_roles & required_roles)
        role_code = role_intersection[0] if role_intersection else None

        # Complete the step
        success = complete_step(
            workflow=workflow,
            step_number=idx,
            user=user,
            role_code=role_code,
            data_snapshot=data
        )

        if not success:
            return {
                "error": "already_completed",
                "message": f"Step {idx} already completed"
            }

        # Also create Action record for audit trail
        try:
            with transaction.atomic():
                Action.objects.create(
                    workflow=workflow,
                    state=state,
                    step=idx,
                    action_type=Action.ActionType.APPROVE,
                    performer=user,
                    role_code=role_code,
                )
        except IntegrityError:
            # Already exists, that's fine
            pass

        # Recalculate current step after completion
        new_current_step = current_step(workflow)
        is_done = new_current_step >= total

        return {
            "done": is_done,
            "state": state,
            "next_step": new_current_step if not is_done else None,
            "completed_step": idx,
        }

    # Non-approval actions are just appended
    Action.objects.create(
        workflow=workflow,
        state=workflow.state,
        step=0,
        action_type=action_type,
        performer=user,
    )

    return {"success": True, "action_type": action_type}


# Backward compatibility functions (for Form3)
def get_form3_step_info(workflow) -> dict:
    """
    Get current step information for Form3 (backward compatibility).

    Args:
        workflow: Workflow instance

    Returns:
        dict: Step information
    """
    if workflow.state != 'Form3':
        return {}

    current = current_step(workflow)
    return get_step_info(workflow, current)


def get_form3_completion_status(workflow) -> dict:
    """
    Get Form3 completion status (backward compatibility).

    Args:
        workflow: Workflow instance

    Returns:
        dict: Completion status
    """
    if workflow.state != 'Form3':
        return {}

    total = steps_required(workflow)
    current = current_step(workflow)

    completed_steps = []
    for step_num in range(current):
        if is_step_completed(workflow, step_num):
            step_info = get_step_info(workflow, step_num)
            completed_steps.append({
                'step': step_num,
                'name_fa': step_info.get('name_fa'),
                'completed': True,
            })

    return {
        'total_steps': total,
        'current_step': current,
        'completed_steps': completed_steps,
        'is_complete': current >= total,
    }


def can_user_edit_form3_section(workflow, section: str, user) -> bool:
    """
    Check if user can edit specific Form3 section (backward compatibility).

    Args:
        workflow: Workflow instance
        section: Section code
        user: User instance

    Returns:
        bool: True if user can edit this section
    """
    if workflow.state != 'Form3':
        return False

    from apps.permissions.utils_simplified import get_editable_sections

    editable_sections = get_editable_sections(user, workflow)

    # Superuser can edit all
    if '*' in editable_sections:
        return True

    return section in editable_sections
