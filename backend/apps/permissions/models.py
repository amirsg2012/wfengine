# apps/permissions/models.py
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model

User = get_user_model()


class PermissionType(models.TextChoices):
    """Types of permissions"""
    VIEW = "VIEW", "View"
    EDIT = "EDIT", "Edit"
    APPROVE = "APPROVE", "Approve"
    TRANSITION = "TRANSITION", "Transition State"
    DELETE = "DELETE", "Delete"


class StatePermission(models.Model):
    """
    Permissions for workflow states.
    Defines who can view/edit/transition workflows in specific states.
    """
    state = models.CharField(max_length=64, help_text="Workflow state name")
    permission_type = models.CharField(
        max_length=32,
        choices=PermissionType.choices,
        help_text="Type of permission"
    )

    # Permission can be assigned to roles or specific users
    role = models.ForeignKey(
        'accounts.OrgRole',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='state_permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='state_permissions'
    )

    # Optional: Restrict to workflows created by specific user
    restrict_to_own = models.BooleanField(
        default=False,
        help_text="If True, permission only applies to user's own workflows"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['state', 'permission_type', 'role']),
            models.Index(fields=['state', 'permission_type', 'user']),
        ]
        verbose_name = "State Permission"
        verbose_name_plural = "State Permissions"

    def __str__(self):
        target = self.role.code if self.role else (self.user.username if self.user else "None")
        return f"{self.state} - {self.permission_type} - {target}"


class StateStepPermission(models.Model):
    """
    Permissions for specific approval steps within states.
    Controls who can approve specific steps in multi-step approval processes.
    """
    state = models.CharField(max_length=64, help_text="Workflow state name")
    step = models.IntegerField(help_text="Step index (0-based)")

    # Permission assigned to roles or specific users
    role = models.ForeignKey(
        'accounts.OrgRole',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='step_permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='step_permissions'
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = [('state', 'step', 'role'), ('state', 'step', 'user')]
        indexes = [
            models.Index(fields=['state', 'step', 'role']),
            models.Index(fields=['state', 'step', 'user']),
        ]
        verbose_name = "State Step Permission"
        verbose_name_plural = "State Step Permissions"

    def __str__(self):
        target = self.role.code if self.role else (self.user.username if self.user else "None")
        return f"{self.state} - Step {self.step} - {target}"


class FormPermission(models.Model):
    """
    Permissions for workflow forms.
    Controls who can view/edit specific forms.
    """
    form_number = models.IntegerField(help_text="Form number (1, 2, 3, etc.)")
    permission_type = models.CharField(
        max_length=32,
        choices=PermissionType.choices,
        help_text="Type of permission"
    )

    # Permission assigned to roles or specific users
    role = models.ForeignKey(
        'accounts.OrgRole',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='form_permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='form_permissions'
    )

    # Optional: Link to specific state (form permissions can vary by state)
    state = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Optional: Restrict permission to specific state"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['form_number', 'permission_type', 'role']),
            models.Index(fields=['form_number', 'permission_type', 'user']),
            models.Index(fields=['form_number', 'state']),
        ]
        verbose_name = "Form Permission"
        verbose_name_plural = "Form Permissions"

    def __str__(self):
        target = self.role.code if self.role else (self.user.username if self.user else "None")
        state_info = f" in {self.state}" if self.state else ""
        return f"Form {self.form_number} - {self.permission_type} - {target}{state_info}"


class FormFieldPermission(models.Model):
    """
    Fine-grained permissions for specific form fields.
    Controls who can view/edit specific fields within forms.
    """
    form_number = models.IntegerField(help_text="Form number")
    field_path = models.CharField(
        max_length=255,
        help_text="JSON path to field (e.g., 'personalInformation.firstName')"
    )
    permission_type = models.CharField(
        max_length=32,
        choices=PermissionType.choices,
        help_text="Type of permission"
    )

    # Permission assigned to roles or specific users
    role = models.ForeignKey(
        'accounts.OrgRole',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='field_permissions'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='field_permissions'
    )

    # Optional: Link to specific state
    state = models.CharField(
        max_length=64,
        null=True,
        blank=True,
        help_text="Optional: Restrict permission to specific state"
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['form_number', 'field_path', 'role']),
            models.Index(fields=['form_number', 'field_path', 'user']),
            models.Index(fields=['form_number', 'state']),
        ]
        verbose_name = "Form Field Permission"
        verbose_name_plural = "Form Field Permissions"

    def __str__(self):
        target = self.role.code if self.role else (self.user.username if self.user else "None")
        state_info = f" in {self.state}" if self.state else ""
        return f"Form {self.form_number}.{self.field_path} - {self.permission_type} - {target}{state_info}"


class PermissionOverride(models.Model):
    """
    Temporary permission overrides for specific workflows.
    Allows granting temporary access to specific users for specific workflows.
    """
    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.CASCADE,
        related_name='permission_overrides'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='permission_overrides'
    )
    permission_type = models.CharField(
        max_length=32,
        choices=PermissionType.choices
    )

    # Optional: Specific form or field
    form_number = models.IntegerField(null=True, blank=True)
    field_path = models.CharField(max_length=255, null=True, blank=True)

    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional expiration time for this override"
    )

    granted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='granted_permission_overrides'
    )
    reason = models.TextField(blank=True, help_text="Reason for override")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['workflow', 'user', 'permission_type']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = "Permission Override"
        verbose_name_plural = "Permission Overrides"

    def __str__(self):
        return f"{self.user.username} - {self.permission_type} on Workflow #{self.workflow.pk}"

    def is_valid(self):
        """Check if override is still valid"""
        if not self.is_active:
            return False
        if self.expires_at:
            from django.utils import timezone
            return timezone.now() < self.expires_at
        return True
