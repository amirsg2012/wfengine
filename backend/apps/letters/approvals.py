# apps/letters/approvals.py
from django.db import models, transaction
from django.contrib.auth import get_user_model
from apps.accounts.utils import user_role_codes
from .workflow_spec import ADVANCER_STEPS

User = get_user_model()

class Approval(models.Model):
    letter_id = models.CharField(max_length=64)         # ObjectId as string
    state = models.CharField(max_length=64)
    step = models.IntegerField()                        # 0-based
    approver = models.ForeignKey(User, on_delete=models.PROTECT)
    role_code = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("letter_id", "state", "step")]  # one approval per step
        indexes = [models.Index(fields=["letter_id", "state"])]

def current_step(letter) -> int:
    """Return next required step index for the letter's current state."""
    taken = (
        Approval.objects
        .filter(letter_id=str(letter.pk), state=letter.state)
        .values_list("step", flat=True)
    )
    if not taken:
        return 0
    return max(taken) + 1

def steps_required(state: str) -> int:
    return len(ADVANCER_STEPS.get(state, []))

def step_roles(state: str, step_idx: int) -> list[str]:
    return ADVANCER_STEPS[state][step_idx]

def can_user_satisfy_step(user, state: str, step_idx: int) -> bool:
    return len(user_role_codes(user) & set(step_roles(state, step_idx))) > 0

def approvals_ok(letter) -> bool:
    return current_step(letter) >= steps_required(letter.state)

def approve_step(letter, user) -> dict:
    """
    Approve the NEXT required step for the letter's current state, if allowed.
    Returns {"done": bool, "state": str, "next_step": int|None}
    """
    with transaction.atomic():
        state = letter.state
        total = steps_required(state)
        idx = current_step(letter)
        if idx >= total:
            return {"done": True, "state": state, "next_step": None}

        if not can_user_satisfy_step(user, state, idx):
            return {"error": "forbidden", "needed_roles": step_roles(state, idx)}

        Approval.objects.create(
            letter_id=str(letter.pk),
            state=state,
            step=idx,
            approver=user,
            role_code=list(user_role_codes(user) & set(step_roles(state, idx)))[0],
        )
        idx += 1
        return {"done": idx >= total, "state": state, "next_step": (None if idx >= total else idx)}
