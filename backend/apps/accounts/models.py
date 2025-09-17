# apps/accounts/models.py
from django.db import models
from django.conf import settings # Import settings

# REMOVED: Do not call get_user_model() at the top level
# from django.contrib.auth import get_user_model
# User = get_user_model()

class OrgRoleGroup(models.Model):
    code = models.CharField(max_length=32, unique=True)
    name_fa = models.CharField(max_length=128)

class OrgRole(models.Model):
    code = models.CharField(max_length=64, unique=True)
    name_fa = models.CharField(max_length=128)
    group = models.ForeignKey(OrgRoleGroup, on_delete=models.CASCADE, related_name="roles")

class Membership(models.Model):
    # CORRECT: Use the string from settings. Django resolves this later.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="memberships"
    )
    role = models.ForeignKey(OrgRole, on_delete=models.CASCADE, related_name="members")

    class Meta:
        unique_together = [("user", "role")]