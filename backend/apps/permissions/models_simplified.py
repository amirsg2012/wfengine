# apps/permissions/models_simplified.py
"""
Simplified permission system - State-Step based only.

Key principles:
1. All permissions are state-step based
2. If a user can APPROVE a step, they can also FILL the form/section for that step
3. Forms or form sections can be represented as state steps
4. Signatures are handled as separate steps with specific role permissions
5. Multiple approvers for the same step = parallel approval (any one can approve)
"""
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class WorkflowState(models.Model):
    """
    Represents a state in the workflow.
    Can be a full form or a form section.
    """
    code = models.CharField(
        max_length=64,
        unique=True,
        help_text="Unique code for this state (e.g., 'Form1', 'Form3_LegalReview')"
    )
    name_en = models.CharField(max_length=128, help_text="English name")
    name_fa = models.CharField(max_length=128, help_text="Persian name")

    # Link to form/section if applicable
    form_number = models.IntegerField(
        null=True,
        blank=True,
        help_text="Form number if this state represents a form"
    )
    form_section = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        help_text="Form section code if this state represents a form section"
    )

    # State ordering
    order = models.IntegerField(
        default=0,
        help_text="Order in workflow progression"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order']
        verbose_name = "Workflow State"
        verbose_name_plural = "Workflow States"

    def __str__(self):
        return f"{self.code} - {self.name_fa}"


class WorkflowStateStep(models.Model):
    """
    Represents a step within a workflow state.
    Each step can have multiple roles that can approve it (parallel approval).
    """
    state = models.ForeignKey(
        WorkflowState,
        on_delete=models.CASCADE,
        related_name='steps'
    )
    step_number = models.IntegerField(
        help_text="Step number within the state (0-based)"
    )

    name_en = models.CharField(max_length=128, help_text="English name")
    name_fa = models.CharField(max_length=128, help_text="Persian name")
    description_fa = models.TextField(
        blank=True,
        help_text="Persian description of what this step does"
    )

    # Action type
    ACTION_TYPES = [
        ('FILL', 'Fill/Edit'),
        ('APPROVE', 'Approve'),
        ('SIGN', 'Sign'),
        ('REVIEW', 'Review'),
    ]
    action_type = models.CharField(
        max_length=32,
        choices=ACTION_TYPES,
        default='APPROVE',
        help_text="Type of action required"
    )

    # Signature field (if action_type is SIGN)
    signature_field = models.CharField(
        max_length=128,
        null=True,
        blank=True,
        help_text="Field path for signature if action requires signing"
    )

    # Multiple approvers support
    requires_all_approvers = models.BooleanField(
        default=False,
        help_text="If True, all assigned roles must approve. If False, any one role can approve (parallel)"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('state', 'step_number')]
        ordering = ['state', 'step_number']
        verbose_name = "Workflow State Step"
        verbose_name_plural = "Workflow State Steps"

    def __str__(self):
        return f"{self.state.code} - Step {self.step_number}: {self.name_fa}"

    def get_required_roles(self):
        """Get all roles that can approve this step"""
        return list(self.step_permissions.filter(is_active=True).values_list('role__code', flat=True))

    def can_user_approve(self, user):
        """Check if user can approve this step"""
        if user.is_superuser:
            return True

        # Check if user has direct permission
        if self.step_permissions.filter(user=user, is_active=True).exists():
            return True

        # Check if user has role-based permission
        user_role_codes = set(user.memberships.values_list('role__code', flat=True))
        step_role_codes = set(self.get_required_roles())

        return bool(user_role_codes & step_role_codes)


class WorkflowStateStepPermission(models.Model):
    """
    Permission assignment for workflow state steps.
    Grants a role or user the ability to approve (and fill) a specific step.
    """
    step = models.ForeignKey(
        WorkflowStateStep,
        on_delete=models.CASCADE,
        related_name='step_permissions'
    )

    # Permission can be assigned to roles or specific users
    role = models.ForeignKey(
        'accounts.OrgRole',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='simplified_step_permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='simplified_step_permissions'
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Allow multiple roles/users per step for parallel approval
        indexes = [
            models.Index(fields=['step', 'role']),
            models.Index(fields=['step', 'user']),
        ]
        verbose_name = "Workflow State Step Permission"
        verbose_name_plural = "Workflow State Step Permissions"

    def __str__(self):
        target = self.role.code if self.role else (self.user.username if self.user else "None")
        return f"{self.step.state.code} - Step {self.step.step_number} - {target}"

    def clean(self):
        """Ensure either role or user is specified, not both"""
        from django.core.exceptions import ValidationError

        if not self.role and not self.user:
            raise ValidationError("Either role or user must be specified")

        if self.role and self.user:
            raise ValidationError("Cannot specify both role and user")


class WorkflowStepCompletion(models.Model):
    """
    Tracks completion of workflow steps.
    Records who completed/approved each step and when.
    """
    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.CASCADE,
        related_name='step_completions'
    )
    step = models.ForeignKey(
        WorkflowStateStep,
        on_delete=models.CASCADE,
        related_name='completions'
    )

    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='completed_steps'
    )
    completed_at = models.DateTimeField(auto_now_add=True)

    # Store the role they used to complete (if multiple roles)
    role_code = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Role code used for this completion"
    )

    # Optional: Store form data snapshot
    data_snapshot = models.JSONField(
        null=True,
        blank=True,
        help_text="Snapshot of form data at time of completion"
    )

    class Meta:
        # For parallel approval: multiple completions possible if requires_all_approvers=True
        # For single approval: unique constraint prevents duplicate
        indexes = [
            models.Index(fields=['workflow', 'step']),
            models.Index(fields=['completed_by', 'completed_at']),
        ]
        verbose_name = "Workflow Step Completion"
        verbose_name_plural = "Workflow Step Completions"

    def __str__(self):
        return f"{self.workflow.pk} - {self.step} - {self.completed_by.username}"


# Permission override for temporary grants
class StepPermissionOverride(models.Model):
    """
    Temporary permission overrides for specific workflows.
    Allows granting temporary access to specific users.
    """
    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.CASCADE,
        related_name='simplified_permission_overrides'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='simplified_permission_overrides'
    )

    # Grant access to specific step
    step = models.ForeignKey(
        WorkflowStateStep,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Specific step to grant access to"
    )

    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiration time for this override"
    )

    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='granted_simplified_permission_overrides'
    )
    reason = models.TextField(blank=True, help_text="Reason for override")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['workflow', 'user']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = "Step Permission Override"
        verbose_name_plural = "Step Permission Overrides"

    def __str__(self):
        return f"{self.user.username} - Step access on Workflow #{self.workflow.pk}"

    def is_valid(self):
        """Check if override is still valid"""
        if not self.is_active:
            return False
        if self.expires_at:
            from django.utils import timezone
            return timezone.now() < self.expires_at
        return True
