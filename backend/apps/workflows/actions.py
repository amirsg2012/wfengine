# apps/workflows/actions.py
"""
IMPORTANT: This file now delegates to the simplified permission system by default.

For legacy workflows, the old system is still available but deprecated.
New workflows should use the simplified state-step based permissions.

To use the old system, set USE_LEGACY_PERMISSIONS = True in workflow instance.
"""
from django.conf import settings
from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from apps.accounts.utils import user_role_codes
from .workflow_spec import ADVANCER_STEPS

# Import simplified actions (preferred)
from . import actions_simplified

User = get_user_model()

# Flag to use simplified permissions (default: True)
USE_SIMPLIFIED_PERMISSIONS = getattr(settings, 'USE_SIMPLIFIED_PERMISSIONS', True)

def current_step(workflow) -> int:
    """Return next required approval step index for the workflow's current state."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS and not getattr(workflow, 'use_legacy_permissions', False):
        return actions_simplified.current_step(workflow)

    # Legacy implementation
    from .models import Action

    if not workflow.pk:
        return 0

    # Prioritize configurable workflow system
    if workflow.is_configurable() and workflow.current_state:
        total_steps = workflow.current_state.get_required_steps_count()
        if total_steps == 0:
            return 0

        # Get completed steps for current state
        state_id = str(workflow.current_state.id)
        completed = workflow.completed_steps.get(state_id, {})
        next_step = len(completed)

        return next_step if next_step < total_steps else total_steps

    # Legacy workflow handling
    # Special handling for Form3 state
    if workflow.state == 'Form3':
        return _get_form3_current_step(workflow)

    # Regular state handling
    taken = list(
        Action.objects.filter(
            workflow=workflow,
            state=workflow.state,
            action_type=Action.ActionType.APPROVE
        ).values_list("step", flat=True)
    )
    return 0 if not taken else (max(taken) + 1)

def steps_required(workflow) -> int:
    """Return total number of steps required for current workflow state."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS and not getattr(workflow, 'use_legacy_permissions', False):
        return actions_simplified.steps_required(workflow)

    # Legacy implementation
    # Prioritize configurable workflow system
    if workflow.is_configurable() and workflow.current_state:
        return workflow.current_state.get_required_steps_count()

    # Legacy workflow handling
    state = workflow.state

    # Special handling for Form3 state
    if state == 'Form3':
        return _get_form3_total_steps()

    # Regular state handling
    return len(ADVANCER_STEPS.get(state, []))

def step_roles(workflow, step_idx: int) -> list[str]:
    """Return list of roles that can satisfy a given step in workflow state."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS and not getattr(workflow, 'use_legacy_permissions', False):
        return actions_simplified.step_roles(workflow, step_idx)

    # Legacy implementation
    # Prioritize configurable workflow system
    if workflow.is_configurable() and workflow.current_state:
        # Get role from WorkflowStateStep
        step = workflow.current_state.steps.filter(step_number=step_idx).first()
        if step and step.required_role:
            return [step.required_role.code]
        return []

    # Legacy workflow handling
    state = workflow.state

    # Special handling for Form3 state
    if state == 'Form3':
        return _get_form3_step_roles(step_idx)

    # Regular state handling
    steps = ADVANCER_STEPS.get(state, [])
    if step_idx >= len(steps):
        return []
    return steps[step_idx]  # "any-of" these roles can satisfy this step

def can_user_satisfy_step(user, workflow, step_idx: int) -> bool:
    """Check if user has required roles to satisfy a given step."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS and not getattr(workflow, 'use_legacy_permissions', False):
        return actions_simplified.can_user_satisfy_step(user, workflow, step_idx)

    # Legacy implementation
    # Prioritize configurable workflow system - use StateStepPermission
    if workflow.is_configurable():
        from apps.permissions.utils import check_state_step_permission
        return check_state_step_permission(user, workflow, step_idx)

    # Legacy workflow handling
    required_roles = step_roles(workflow, step_idx)
    if not required_roles:
        return False

    user_roles = set(user_role_codes(user))
    return len(user_roles & set(required_roles)) > 0

def actions_ok(workflow) -> bool:
    """Condition check for FSM transitions."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS and not getattr(workflow, 'use_legacy_permissions', False):
        return actions_simplified.actions_ok(workflow)

    # Legacy implementation
    if not workflow.pk:
        return False
    return current_step(workflow) >= steps_required(workflow)

def get_workflows_pending_user_action(user) -> list:
    """Get all workflows where the user can perform the next required action."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS:
        return actions_simplified.get_workflows_pending_user_action(user)

    # Legacy implementation
    from .models import Workflow

    user_roles = set(user_role_codes(user))
    if not user_roles:
        return []

    pending = []
    # Exclude completed workflows (terminal state is "Settlment")
    for wf in Workflow.objects.exclude(state="Settlment"):
        idx = current_step(wf)
        if idx >= steps_required(wf):
            continue
        if can_user_satisfy_step(user, wf, idx):
            pending.append(wf)

    return pending

def perform_action(workflow, user, action_type: str, data: dict = None) -> dict:
    """Perform an action on the workflow. Returns dict with flags for the caller."""
    # Use simplified permissions by default
    if USE_SIMPLIFIED_PERMISSIONS and not getattr(workflow, 'use_legacy_permissions', False):
        return actions_simplified.perform_action(workflow, user, action_type, data)

    # Legacy implementation
    from .models import Action

    # Validate action_type first
    if not action_type:
        return {"error": "invalid_action", "message": "Action type cannot be empty or None"}
    
    # Check if action_type is valid
    valid_action_types = [choice[0] for choice in Action.ActionType.choices]
    if action_type not in valid_action_types:
        return {"error": "invalid_action", "message": f"Invalid action type: '{action_type}'. Valid types are: {valid_action_types}"}

    if action_type == Action.ActionType.APPROVE:
        state = workflow.state
        total = steps_required(workflow)
        idx = current_step(workflow)

        if idx >= total:
            return {"done": True, "state": state, "next_step": None}

        if not can_user_satisfy_step(user, workflow, idx):
            return {"error": "forbidden", "needed_roles": step_roles(workflow, idx)}

        # Special handling for Form3 approvals
        if state == 'Form3':
            return _perform_form3_approval(workflow, user, idx, total)

        # Regular approval handling
        # Choose one intersecting role
        role_intersection = list(set(user_role_codes(user)) & set(step_roles(workflow, idx)))
        role_code = role_intersection[0] if role_intersection else None

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

                # For configurable workflows, also update completed_steps
                if workflow.is_configurable():
                    from datetime import datetime
                    state_id = str(workflow.current_state.id)

                    if state_id not in workflow.completed_steps:
                        workflow.completed_steps[state_id] = {}

                    workflow.completed_steps[state_id][str(idx)] = {
                        'by': str(user.id),
                        'by_username': user.username,
                        'role_code': role_code,
                        'at': datetime.now().isoformat(),
                    }

                    workflow.save(update_fields=['completed_steps', 'updated_at'])

        except IntegrityError:
            # Another approver just wrote this step - that's fine
            pass

        # Recalculate current step AFTER creating the action
        new_current_step = current_step(workflow)
        is_done = new_current_step >= total

        return {
            "done": is_done,
            "state": state,
            "next_step": new_current_step if not is_done else None
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

# ===== Form3 Specific Helper Functions =====

def _get_form3_current_step(workflow) -> int:
    """Get current step within Form3 state (returns 0-based index)."""
    from .forms.form_3 import PropertyStatusReviewForm

    approval_steps = PropertyStatusReviewForm.get_approval_steps()

    # Check completion status of each step (1-based)
    for step_num in range(1, len(approval_steps) + 1):
        if not PropertyStatusReviewForm.is_step_completed(workflow, step_num):
            return step_num - 1  # Return 0-based index

    # All steps completed - return total count (0-based would be len-1, but we want to indicate "done")
    return len(approval_steps)

def _get_form3_total_steps() -> int:
    """Get total steps required for Form3."""
    from .forms.form_3 import PropertyStatusReviewForm
    approval_steps = PropertyStatusReviewForm.get_approval_steps()
    return len(approval_steps)

def _get_form3_step_roles(step_idx: int) -> list[str]:
    """Get required role for a specific Form3 step (0-indexed input, 1-based storage)."""
    from .forms.form_3 import PropertyStatusReviewForm

    # Convert 0-indexed to 1-indexed for Form3 steps
    step_num = step_idx + 1

    approval_steps = PropertyStatusReviewForm.get_approval_steps()

    if step_num in approval_steps:
        return [approval_steps[step_num]['role']]

    return []

def _perform_form3_approval(workflow, user, step_idx: int, total: int) -> dict:
    """Handle Form3 specific approval logic."""
    from .models import Action
    from .forms.form_3 import PropertyStatusReviewForm

    # Convert 0-indexed to 1-indexed for Form3 steps
    form3_step = step_idx + 1

    approval_steps = PropertyStatusReviewForm.get_approval_steps()

    if form3_step not in approval_steps:
        return {"error": "invalid_step", "message": f"Invalid Form3 step: {form3_step}"}

    step_info = approval_steps[form3_step]
    user_roles = [membership.role.code for membership in user.memberships.all()]

    # Check if user has the required role for this specific step
    if step_info['role'] not in user_roles:
        return {"error": "forbidden", "needed_roles": [step_info['role']]}

    # For Form3, we need to mark the step as completed by adding signature
    # This is done via form submission, not through Action creation
    # But we still create an Action record for tracking

    try:
        with transaction.atomic():
            Action.objects.create(
                workflow=workflow,
                state='Form3',
                step=step_idx,  # Keep 0-indexed for Action model consistency
                action_type=Action.ActionType.APPROVE,
                performer=user,
                role_code=step_info['role'],
            )
    except IntegrityError:
        # Another approver just wrote this step
        pass

    # For Form3, check if the actual form step is completed
    # (This would be done via form submission with signature)
    new_current_step = _get_form3_current_step(workflow)
    is_done = new_current_step >= total

    return {
        "done": is_done,
        "state": 'Form3',
        "next_step": new_current_step if not is_done else None,
        "form3_step_info": step_info
    }

# ===== Public Form3 Helper Functions =====

def get_form3_step_info(workflow) -> dict:
    """Get current step information for Form3."""
    if workflow.state != 'Form3':
        return {}
    
    from .forms.form_3 import PropertyStatusReviewForm
    return PropertyStatusReviewForm.get_current_step_info(workflow)

def get_form3_completion_status(workflow) -> dict:
    """Get Form3 completion status."""
    if workflow.state != 'Form3':
        return {}
    
    from .forms.form_3 import PropertyStatusReviewForm
    return PropertyStatusReviewForm.get_completion_status(workflow)

def can_user_edit_form3_section(workflow, section: str, user) -> bool:
    """Check if user can edit specific Form3 section."""
    if workflow.state != 'Form3':
        return False
    
    from .forms.form_3 import PropertyStatusReviewForm
    user_roles = [membership.role.code for membership in user.memberships.all()]
    
    for role in user_roles:
        editable_sections = PropertyStatusReviewForm.get_editable_sections(workflow, role)
        if editable_sections.get(section, False):
            return True
    
    return False