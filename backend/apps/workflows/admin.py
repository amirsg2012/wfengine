# apps/workflows/admin.py
from django.contrib import admin
from .models import Workflow, Action, Attachment, Comment

@admin.register(Workflow)
class WorkflowAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "state", "created_by", "created_at")
    search_fields = ("title", "state")

@admin.register(Action)
class ActionAdmin(admin.ModelAdmin):
    list_display = ("workflow_id", "state", "step", "action_type", "performer", "role_code", "created_at")
    list_filter = ("state", "action_type", "role_code")

@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("workflow", "file", "uploaded_by", "uploaded_at")

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ("workflow", "author", "created_at")