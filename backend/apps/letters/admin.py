# apps/letters/admin.py
from django.contrib import admin
from .models import Letter
from .approvals import Approval

@admin.register(Letter)
class LetterAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "state", "created_by", "created_at")
    search_fields = ("title", "state")

@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    list_display = ("letter_id", "state", "step", "approver", "role_code", "created_at")
    list_filter = ("state", "role_code")
