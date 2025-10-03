# backend/api/v1/forms_views.py
"""
API views for dynamic forms system
"""
import json
from rest_framework import viewsets, permissions, decorators, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from apps.forms.models import DynamicForm, FormField, FormData
from apps.workflows.models import Workflow
from .serializers import (
    DynamicFormSchemaSerializer, DynamicFormListSerializer,
    FormFieldSerializer, FormDataSubmissionSerializer, FormDataSerializer
)


class DynamicFormViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dynamic forms

    GET /api/dynamic-forms/ - List all active forms
    GET /api/dynamic-forms/{code}/ - Get form schema for rendering
    """
    queryset = DynamicForm.objects.filter(is_active=True).order_by('form_number', 'code')
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'code'

    def get_serializer_class(self):
        if self.action == 'list':
            return DynamicFormListSerializer
        return DynamicFormSchemaSerializer


class FormFieldViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for form fields (read-only for API users)

    GET /api/form-fields/ - List all active fields
    GET /api/form-fields/{code}/ - Get field details
    """
    queryset = FormField.objects.filter(is_active=True).order_by('display_order', 'code')
    serializer_class = FormFieldSerializer
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'code'


class WorkflowFormDataViewSet(viewsets.ViewSet):
    """
    ViewSet for workflow form data submission and retrieval

    GET /api/workflow-form-data/{workflow_id}/ - Get all form data for workflow
    GET /api/workflow-form-data/{workflow_id}/?form_code=X - Get specific form data
    POST /api/workflow-form-data/{workflow_id}/submit/ - Submit form data
    """
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, pk=None):
        """
        Get form data for a workflow
        Query param 'form_code' can filter to specific form
        """
        workflow = get_object_or_404(Workflow, pk=pk)

        # Check permissions
        # TODO: Add permission check using apps.permissions

        form_code = request.query_params.get('form_code')

        if form_code:
            # Get specific form data
            try:
                form_data = FormData.objects.get(workflow=workflow, form__code=form_code)
                serializer = FormDataSerializer(form_data)
                return Response(serializer.data)
            except FormData.DoesNotExist:
                # Return empty data with form schema
                form = get_object_or_404(DynamicForm, code=form_code, is_active=True)

                # Pre-populate from workflow.data
                pre_populated_data = {}
                schema = form.get_schema()

                for section in schema['sections']:
                    for field_def in section['fields']:
                        field_code = field_def['code']

                        # Check if value exists in workflow.data
                        if field_code in workflow.data:
                            pre_populated_data[field_code] = workflow.data[field_code]

                        # Handle computed fields
                        elif field_def.get('is_computed'):
                            field_obj = FormField.objects.get(code=field_code)
                            computed_value = field_obj.compute_value(workflow.data)
                            if computed_value:
                                pre_populated_data[field_code] = computed_value

                return Response({
                    'workflow_id': str(workflow.pk),
                    'form_code': form_code,
                    'data': pre_populated_data,
                    'submitted_at': None,
                    'form_version': form.version
                })
        else:
            # Get all form data for workflow
            form_data_qs = FormData.objects.filter(workflow=workflow)
            serializer = FormDataSerializer(form_data_qs, many=True)
            return Response(serializer.data)

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit form data for a workflow

        Supports both JSON and multipart/form-data (for file uploads)

        JSON Request body:
        {
            "form_code": "applicant_info",
            "data": {
                "first_name": "احمد",
                "last_name": "رضایی",
                ...
            }
        }

        Multipart Request body:
        - form_code: "applicant_info"
        - data: '{"first_name": "احمد", ...}' (JSON string)
        - file_fields: '["form1_address"]' (JSON array of field codes)
        - file_form1_address: <file>
        """
        workflow = get_object_or_404(Workflow, pk=pk)

        # Check permissions
        # TODO: Add permission check using apps.permissions

        # Handle multipart/form-data (file uploads)
        if request.content_type and 'multipart/form-data' in request.content_type:
            form_code = request.POST.get('form_code')
            data = json.loads(request.POST.get('data', '{}'))
            file_fields = json.loads(request.POST.get('file_fields', '[]'))

            # Validate form exists
            if not DynamicForm.objects.filter(code=form_code, is_active=True).exists():
                return Response(
                    {'error': f"Form '{form_code}' not found or inactive"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            form = DynamicForm.objects.get(code=form_code, is_active=True)

            # Process uploaded files and save to MinIO
            from django.core.files.storage import default_storage

            for field_code in file_fields:
                file_key = f'file_{field_code}'
                if file_key in request.FILES:
                    uploaded_file = request.FILES[file_key]
                    # Save file to MinIO and store the path in data
                    file_path = default_storage.save(
                        f'workflow_{workflow.id}/forms/{form_code}/{field_code}/{uploaded_file.name}',
                        uploaded_file
                    )
                    # Store the file URL in the data
                    data[field_code] = default_storage.url(file_path)
        else:
            # Handle JSON (regular form submission)
            serializer = FormDataSubmissionSerializer(data=request.data)
            if not serializer.is_valid():
                print(f"[FormDataSubmit] Validation errors: {serializer.errors}")
                print(f"[FormDataSubmit] Request data: {request.data}")
            serializer.is_valid(raise_exception=True)

            form_code = serializer.validated_data['form_code']
            data = serializer.validated_data['data']
            form = DynamicForm.objects.get(code=form_code, is_active=True)

        with transaction.atomic():
            # Update or create form data
            form_data, created = FormData.objects.update_or_create(
                workflow=workflow,
                form=form,
                defaults={
                    'data': data,
                    'submitted_by': request.user,
                    'form_version': form.version
                }
            )

            # Merge data into workflow.data for cross-form persistence
            workflow.update_data(data, merge=True)
            workflow.save()

        response_serializer = FormDataSerializer(form_data)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
