# apps/accounts/models.py
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

class OrgRoleGroup(models.Model):
    code = models.CharField(max_length=32, unique=True)   # e.g., 'RE'
    name_fa = models.CharField(max_length=128)

class OrgRole(models.Model):
    code = models.CharField(max_length=64, unique=True)   # e.g., 'RE_MANAGER'
    name_fa = models.CharField(max_length=128)
    group = models.ForeignKey(OrgRoleGroup, on_delete=models.CASCADE, related_name="roles")

class Membership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="memberships")
    role = models.ForeignKey(OrgRole, on_delete=models.CASCADE, related_name="members")
    class Meta:
        unique_together = [("user","role")]
