from django.db import transaction, IntegrityError
from django.contrib.auth import get_user_model
from apps.accounts.utils import user_role_codes
from .workflow_spec import ADVANCER_STEPS

User = get_user_model()

def current_step(workflow) -> int:
    """Return next required approval step index for the workflow's current state."""
    from .models import Action
    if not workflow.pk:
        return 0
    taken = list(
        Action.objects.filter(
            workflow=workflow,
            state=workflow.state,
            action_type=Action.ActionType.APPROVE
        ).values_list("step", flat=True)
    )
    return 0 if not taken else (max(taken) + 1)

def steps_required(state: str) -> int:
    return len(ADVANCER_STEPS.get(state, []))

def step_roles(state: str, step_idx: int) -> list[str]:
    steps = ADVANCER_STEPS.get(state, [])
    if step_idx >= len(steps):
        return []
    return steps[step_idx]  # "any-of" these roles can satisfy this step

def can_user_satisfy_step(user, state: str, step_idx: int) -> bool:
    required_roles = step_roles(state, step_idx)
    if not required_roles:
        return False
    user_roles = set(user_role_codes(user))
    return len(user_roles & set(required_roles)) > 0

def actions_ok(workflow) -> bool:
    """Condition check for FSM transitions."""
    if not workflow.pk:
        return False
    return current_step(workflow) >= steps_required(workflow.state)

def get_workflows_pending_user_action(user) -> list:
    """Get all workflows where the user can perform the next required action."""
    from .models import Workflow
    user_roles = set(user_role_codes(user))
    if not user_roles:
        return []
    pending = []
    # Exclude completed workflows (terminal state is "Settlment")
    for wf in Workflow.objects.exclude(state="Settlment"):
        idx = current_step(wf)
        if idx >= steps_required(wf.state):
            continue
        if can_user_satisfy_step(user, wf.state, idx):
            pending.append(wf)
    return pending

def perform_action(workflow, user, action_type: str, data: dict = None) -> dict:
    """Perform an action on the workflow. Returns dict with flags for the caller."""
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
        total = steps_required(state)
        idx = current_step(workflow)

        if idx >= total:
            return {"done": True, "state": state, "next_step": None}

        if not can_user_satisfy_step(user, state, idx):
            return {"error": "forbidden", "needed_roles": step_roles(state, idx)}

        # choose one intersecting role (we already know intersection is non-empty)
        role_intersection = list(set(user_role_codes(user)) & set(step_roles(state, idx)))
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
        except IntegrityError:
            # Another approver just wrote this step. Recalculate.
            idx = current_step(workflow)

        idx += 1
        return {"done": idx >= total, "state": state, "next_step": (None if idx >= total else idx)}

    # Non-approval actions are just appended
    Action.objects.create(
        workflow=workflow,
        state=workflow.state,
        step=0,
        action_type=action_type,
        performer=user,
    )
    return {"success": True, "action_type": action_type}