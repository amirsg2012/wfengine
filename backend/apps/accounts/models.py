# apps/accounts/models.py
from django.db import models
from django.conf import settings

# Import signature models
from .signature_models import UserSignature, SignatureLog

class OrgRoleGroup(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name_fa = models.CharField(max_length=128)

class OrgRole(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name_fa = models.CharField(max_length=128)
    group = models.ForeignKey(OrgRoleGroup, on_delete=models.CASCADE, related_name="roles")

class Membership(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships"
    )
    role = models.ForeignKey(OrgRole, on_delete=models.CASCADE, related_name="members")

    class Meta:
        unique_together = [("user", "role")]


# Re-export signature models for convenience
__all__ = ['OrgRoleGroup', 'OrgRole', 'Membership', 'UserSignature', 'SignatureLog']