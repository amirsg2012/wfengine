# backend/api/v1/serializers.py
"""
Centralized serializers for all API endpoints
"""
from rest_framework import serializers
from apps.workflows.models import (
    Workflow, Attachment, Comment, Action,
    WorkflowTemplate, WorkflowState, WorkflowStateStep, WorkflowTransition
)
from apps.workflows.forms.registry import FormRegistry
from apps.accounts.models import OrgRole, OrgRoleGroup, Membership
from apps.accounts.signature_models import UserSignature, SignatureLog
from apps.forms.models import DynamicForm, FormField, FormSection, FormFieldMapping, FormData
from django.contrib.auth import get_user_model

User = get_user_model()


# ==================== User & Auth Serializers ====================

class UserSerializer(serializers.ModelSerializer):
    """Serializer for user information"""
    id = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'is_staff', 'is_superuser', 'roles']
        read_only_fields = ['id', 'username', 'is_staff', 'is_superuser']

    def get_id(self, obj):
        return str(obj.pk)

    def get_roles(self, obj):
        """Get user's organizational roles"""
        from apps.accounts.utils import user_role_codes
        return user_role_codes(obj)


class OrgRoleSerializer(serializers.ModelSerializer):
    """Serializer for organizational roles"""
    id = serializers.SerializerMethodField()
    group_name = serializers.CharField(source='group.name_fa', read_only=True)

    class Meta:
        model = OrgRole
        fields = ['id', 'code', 'name_fa', 'group_name']

    def get_id(self, obj):
        return str(obj.pk)


# ==================== Configurable Workflow Serializers ====================

class WorkflowTemplateSerializer(serializers.ModelSerializer):
    """Serializer for workflow templates"""
    id = serializers.SerializerMethodField()
    state_count = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowTemplate
        fields = ['id', 'code', 'name', 'name_fa', 'description', 'is_active', 'state_count', 'created_at']
        read_only_fields = ['created_at']

    def get_id(self, obj):
        return str(obj.pk)

    def get_state_count(self, obj):
        return obj.states.count()


class WorkflowStateSerializer(serializers.ModelSerializer):
    """Serializer for workflow states"""
    id = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowState
        fields = ['id', 'code', 'name', 'name_fa', 'state_type', 'form_number', 'order']

    def get_id(self, obj):
        return str(obj.pk)


class WorkflowStateStepSerializer(serializers.ModelSerializer):
    """Serializer for workflow state steps"""
    id = serializers.SerializerMethodField()

    class Meta:
        model = WorkflowStateStep
        fields = ['id', 'step_number', 'name_fa', 'required_role_code', 'requires_signature', 'requires_comment']

    def get_id(self, obj):
        return str(obj.pk)


class WorkflowTransitionSerializer(serializers.ModelSerializer):
    """Serializer for workflow transitions"""
    id = serializers.SerializerMethodField()
    from_state = WorkflowStateSerializer(read_only=True)
    to_state = WorkflowStateSerializer(read_only=True)

    class Meta:
        model = WorkflowTransition
        fields = [
            'id', 'name', 'name_fa', 'from_state', 'to_state',
            'condition_type', 'is_automatic', 'order'
        ]

    def get_id(self, obj):
        return str(obj.pk)


# ==================== Dynamic Forms Serializers ====================

class FormFieldSerializer(serializers.ModelSerializer):
    """Serializer for form fields"""
    id = serializers.SerializerMethodField()
    validation = serializers.SerializerMethodField()

    class Meta:
        model = FormField
        fields = [
            'id', 'code', 'name', 'name_fa', 'field_type', 'description',
            'is_required', 'is_computed', 'source_fields', 'computation_rule',
            'options', 'placeholder', 'placeholder_fa', 'default_value',
            'help_text', 'help_text_fa', 'width', 'data_path', 'validation'
        ]

    def get_id(self, obj):
        return str(obj.pk)

    def get_validation(self, obj):
        return obj.get_validation_rules()


class FormFieldMappingSerializer(serializers.ModelSerializer):
    """Serializer for form field mappings"""
    id = serializers.SerializerMethodField()
    field = FormFieldSerializer(read_only=True)

    class Meta:
        model = FormFieldMapping
        fields = [
            'id', 'field', 'order', 'is_required', 'is_readonly', 'is_hidden',
            'default_value', 'show_if_field', 'show_if_value'
        ]

    def get_id(self, obj):
        return str(obj.pk)


class FormSectionSerializer(serializers.ModelSerializer):
    """Serializer for form sections"""
    id = serializers.SerializerMethodField()
    fields = serializers.SerializerMethodField()

    class Meta:
        model = FormSection
        fields = [
            'id', 'code', 'name', 'name_fa', 'description', 'order',
            'is_collapsible', 'is_collapsed_default', 'fields'
        ]

    def get_id(self, obj):
        return str(obj.pk)

    def get_fields(self, obj):
        """Get field mappings with field details"""
        mappings = obj.field_mappings.all().order_by('order')
        return FormFieldMappingSerializer(mappings, many=True).data


class DynamicFormSerializer(serializers.ModelSerializer):
    """Serializer for dynamic forms"""
    id = serializers.SerializerMethodField()
    schema = serializers.SerializerMethodField()

    class Meta:
        model = DynamicForm
        fields = [
            'id', 'code', 'name', 'name_fa', 'description',
            'form_number', 'version', 'is_active', 'schema'
        ]

    def get_id(self, obj):
        return str(obj.pk)

    def get_schema(self, obj):
        """Get complete form schema with sections and fields"""
        return obj.get_schema()


class FormDataSerializer(serializers.ModelSerializer):
    """Serializer for form data submissions"""
    id = serializers.SerializerMethodField()
    workflow_id = serializers.SerializerMethodField()
    form_code = serializers.CharField(source='form.code', read_only=True)

    class Meta:
        model = FormData
        fields = [
            'id', 'workflow_id', 'form_code', 'data',
            'submitted_by', 'submitted_at', 'form_version'
        ]
        read_only_fields = ['submitted_by', 'submitted_at', 'form_version']

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk) if obj.workflow else None


# ==================== Workflow Serializers ====================

class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for workflow attachments"""
    id = serializers.SerializerMethodField(read_only=True)
    uploaded_by = serializers.CharField(source="uploaded_by.username", read_only=True)
    workflow_id = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Attachment
        fields = ["id", "file", "name", "uploaded_by", "uploaded_at", "workflow_id", "workflow"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk) if obj.workflow else None


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for workflow comments"""
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
    """Serializer for workflow actions"""
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


class WorkflowListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for workflow list views"""
    id = serializers.SerializerMethodField(read_only=True)
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    applicant_name = serializers.SerializerMethodField()
    applicant_national_id = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            "id", "title", "state", "created_by", "created_at", "updated_at",
            "applicant_name", "applicant_national_id"
        ]
        read_only_fields = ["state", "created_by", "created_at", "updated_at"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_applicant_name(self, obj):
        return obj.applicant_name

    def get_applicant_national_id(self, obj):
        return obj.applicant_national_id


class WorkflowDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for workflow detail views"""
    id = serializers.SerializerMethodField(read_only=True)
    created_by = serializers.CharField(source="created_by.username", read_only=True)
    attachments = serializers.SerializerMethodField(read_only=True)
    comments = serializers.SerializerMethodField(read_only=True)
    applicant_name = serializers.SerializerMethodField()
    applicant_national_id = serializers.SerializerMethodField()
    property_address = serializers.SerializerMethodField()
    registration_plate_number = serializers.SerializerMethodField()
    data = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = [
            "id", "title", "body", "state", "created_by", "created_at", "updated_at",
            "attachments", "comments", "applicant_name", "applicant_national_id",
            "property_address", "registration_plate_number", "data"
        ]
        read_only_fields = ["state", "created_by", "created_at", "updated_at"]

    def get_id(self, obj):
        return str(obj.pk)

    def get_attachments(self, obj):
        try:
            attachments = Attachment.objects.filter(workflow_id=obj.pk)
            return AttachmentSerializer(attachments, many=True).data
        except Exception:
            return []

    def get_comments(self, obj):
        try:
            comments = Comment.objects.filter(workflow_id=obj.pk)
            return CommentSerializer(comments, many=True).data
        except Exception:
            return []

    def get_applicant_name(self, obj):
        return obj.applicant_name

    def get_applicant_national_id(self, obj):
        return obj.applicant_national_id

    def get_property_address(self, obj):
        return obj.property_address

    def get_registration_plate_number(self, obj):
        return obj.registration_plate_number

    def get_data(self, obj):
        """Return workflow data as dict for form inheritance"""
        return obj.data

    def validate_title(self, value):
        if not value or len(value.strip()) < 5:
            raise serializers.ValidationError("عنوان باید حداقل ۵ کاراکتر داشته باشد")
        return value.strip()


class FormDataSerializer(serializers.Serializer):
    """Generic serializer for form data submissions"""
    form_number = serializers.IntegerField()
    data = serializers.DictField()

    def validate(self, attrs):
        form_number = attrs.get('form_number')
        form_data = attrs.get('data')

        # Get form class and validate
        form_class = FormRegistry.get_form(form_number)
        if not form_class:
            raise serializers.ValidationError(f"Form {form_number} not found")

        # Validate form data
        errors = form_class.validate(form_data)
        if errors:
            raise serializers.ValidationError({"data": errors})

        return attrs


class WorkflowFormSerializer(serializers.ModelSerializer):
    """Serializer for workflow with form data"""
    id = serializers.SerializerMethodField()
    data = serializers.SerializerMethodField()
    applicant_name = serializers.SerializerMethodField()
    applicant_national_id = serializers.SerializerMethodField()
    property_address = serializers.SerializerMethodField()
    registration_plate_number = serializers.SerializerMethodField()

    class Meta:
        model = Workflow
        fields = ['id', 'title', 'state', 'created_at', 'updated_at', 'data',
                  'applicant_name', 'applicant_national_id', 'property_address',
                  'registration_plate_number']
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_id(self, obj):
        return str(obj.pk)

    def get_data(self, obj):
        return obj.data

    def get_applicant_name(self, obj):
        return obj.applicant_name

    def get_applicant_national_id(self, obj):
        return obj.applicant_national_id

    def get_property_address(self, obj):
        return obj.property_address

    def get_registration_plate_number(self, obj):
        return obj.registration_plate_number


# ==================== Dynamic Forms Serializers ====================

class FormFieldSerializer(serializers.ModelSerializer):
    """Serializer for form fields"""
    id = serializers.SerializerMethodField()
    validation = serializers.SerializerMethodField()

    class Meta:
        model = FormField
        fields = [
            'id', 'code', 'name', 'name_fa', 'description', 'field_type',
            'is_computed', 'source_fields', 'computation_rule',
            'is_required', 'validation', 'options',
            'placeholder', 'placeholder_fa', 'default_value',
            'help_text', 'help_text_fa', 'width', 'data_path'
        ]

    def get_id(self, obj):
        return str(obj.pk)

    def get_validation(self, obj):
        return obj.get_validation_rules()


class DynamicFormSchemaSerializer(serializers.ModelSerializer):
    """Serializer for complete form schema with sections and fields"""
    id = serializers.SerializerMethodField()
    sections = serializers.SerializerMethodField()

    class Meta:
        model = DynamicForm
        fields = ['id', 'code', 'name', 'name_fa', 'description', 'version', 'sections']

    def get_id(self, obj):
        return str(obj.pk)

    def get_sections(self, obj):
        """Get complete form schema"""
        return obj.get_schema()['sections']


class DynamicFormListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for form lists"""
    id = serializers.SerializerMethodField()
    field_count = serializers.SerializerMethodField()

    class Meta:
        model = DynamicForm
        fields = ['id', 'code', 'name', 'name_fa', 'description', 'form_number', 'version', 'is_active', 'field_count']

    def get_id(self, obj):
        return str(obj.pk)

    def get_field_count(self, obj):
        count = 0
        for section in obj.sections.all():
            count += section.field_mappings.count()
        return count


class FormDataSubmissionSerializer(serializers.Serializer):
    """Serializer for form data submission"""
    form_code = serializers.CharField()
    data = serializers.DictField()

    def validate_form_code(self, value):
        """Validate that form exists"""
        if not DynamicForm.objects.filter(code=value, is_active=True).exists():
            raise serializers.ValidationError(f"Form '{value}' not found or inactive")
        return value

    def validate(self, attrs):
        """Validate form data against form schema"""
        form_code = attrs['form_code']
        data = attrs['data']

        # Get form
        form = DynamicForm.objects.get(code=form_code, is_active=True)

        # Get all required fields from schema
        schema = form.get_schema()
        errors = {}

        for section in schema['sections']:
            for field_def in section['fields']:
                field_code = field_def['code']
                is_required = field_def.get('is_required', False)

                # Check required fields
                if is_required and not data.get(field_code):
                    errors[field_code] = f"Field '{field_def['name_fa']}' is required"

                # Validate against field validation rules
                if field_code in data and data[field_code]:
                    validation = field_def.get('validation', {})
                    value = data[field_code]

                    # Min/max length for strings
                    if isinstance(value, str):
                        if 'minLength' in validation and len(value) < validation['minLength']:
                            errors[field_code] = validation.get('message', f"Minimum length is {validation['minLength']}")
                        if 'maxLength' in validation and len(value) > validation['maxLength']:
                            errors[field_code] = validation.get('message', f"Maximum length is {validation['maxLength']}")

                    # Min/max value for numbers
                    if isinstance(value, (int, float)):
                        if 'min' in validation and value < validation['min']:
                            errors[field_code] = validation.get('message', f"Minimum value is {validation['min']}")
                        if 'max' in validation and value > validation['max']:
                            errors[field_code] = validation.get('message', f"Maximum value is {validation['max']}")

        if errors:
            raise serializers.ValidationError({"data": errors})

        return attrs


class FormDataSerializer(serializers.ModelSerializer):
    """Serializer for form data submissions"""
    id = serializers.SerializerMethodField()
    workflow_id = serializers.SerializerMethodField()
    form_code = serializers.CharField(source='form.code', read_only=True)
    submitted_by_username = serializers.CharField(source='submitted_by.username', read_only=True)

    class Meta:
        model = FormData
        fields = ['id', 'workflow_id', 'form_code', 'data', 'submitted_by_username',
                  'submitted_at', 'form_version']
        read_only_fields = ['submitted_at', 'form_version']

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk)
