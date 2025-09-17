# apps/workflows/serializers.py
from rest_framework import serializers
from .models import Workflow, Attachment, Comment, Action
from bson import ObjectId


class AttachmentSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField(read_only=True)
    uploaded_by = serializers.CharField(source="uploaded_by.username", read_only=True)
    workflow_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Attachment
        fields = ["id", "file", "name", "uploaded_by", "uploaded_at", "workflow_id"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk) if obj.workflow else None


class CommentSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField(read_only=True)
    author = serializers.CharField(source="author.username", read_only=True)
    workflow_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "text", "author", "created_at", "workflow_id"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk) if obj.workflow else None


class ActionSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField(read_only=True)
    performer = serializers.CharField(source="performer.username", read_only=True)
    workflow_id = serializers.SerializerMethodField(read_only=True)
    workflow_title = serializers.CharField(source="workflow.title", read_only=True)

    class Meta:
        model = Action
        fields = ["id", "workflow_id", "workflow_title", "state", "step", "action_type",
                  "performer", "role_code", "created_at"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk) if obj.workflow else None


class WorkflowSerializer(serializers.ModelSerializer):
    id = serializers.SerializerMethodField(read_only=True)
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    attachments = serializers.SerializerMethodField(read_only=True)
    comments = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Workflow
        fields = [
            "id", "title", "body", "applicant_name", "applicant_national_id",
            "state", "created_by", "created_at", "updated_at", "attachments", "comments"
        ]
        read_only_fields = ["state", "created_by", "created_at", "updated_at"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_attachments(self, obj):
        # Get attachments without using reverse foreign key to avoid ObjectId issues
        try:
            attachments = Attachment.objects.filter(workflow_id=obj.pk)
            return AttachmentSerializer(attachments, many=True).data
        except Exception:
            return []

    def get_comments(self, obj):
        # Get comments without using reverse foreign key to avoid ObjectId issues
        try:
            comments = Comment.objects.filter(workflow_id=obj.pk)
            return CommentSerializer(comments, many=True).data
        except Exception:
            return []

    def validate_applicant_national_id(self, value):
        """Validate Iranian National ID"""
        if not value or len(value) != 10 or not value.isdigit():
            raise serializers.ValidationError("کد ملی باید ۱۰ رقم باشد")

        if value == '0000000000':
            raise serializers.ValidationError("کد ملی معتبر نیست")

        # Iranian National ID validation algorithm
        check_sum = sum(int(value[i]) * (10 - i) for i in range(9)) % 11
        check_digit = int(value[9])

        if not ((check_sum < 2 and check_digit == check_sum) or
                (check_sum >= 2 and check_digit == 11 - check_sum)):
            raise serializers.ValidationError("کد ملی معتبر نیست")

        return value

    def validate_title(self, value):
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError("عنوان باید حداقل ۵ کاراکتر داشته باشد")
        return value.strip()

    def validate_applicant_name(self, value):
        if not value or len(value.strip()) < 2:
            raise serializers.ValidationError("نام متقاضی باید حداقل ۲ کاراکتر داشته باشد")
        return value.strip()