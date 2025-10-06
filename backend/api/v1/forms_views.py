# backend/api/v1/forms_views.py
"""
API views for dynamic forms system
"""
import json
from rest_framework import viewsets, permissions, decorators, status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import transaction

from apps.workflows.models_dynamic_forms import DynamicForm, FormField, FormSection
from apps.workflows.models import Workflow
from .serializers import (
    DynamicFormSchemaSerializer, DynamicFormListSerializer,
    FormFieldSerializer, FormDataSubmissionSerializer, FormDataSerializer
)


class DynamicFormViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dynamic forms

    GET /api/dynamic-forms/ - List all active forms
    GET /api/dynamic-forms/{id}/ - Get form schema for rendering
    """
    queryset = DynamicForm.objects.filter(is_active=True).order_by('display_order', 'form_number')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return DynamicFormListSerializer
        return DynamicFormSchemaSerializer

    def get_queryset(self):
        """Filter by form_number if provided"""
        qs = super().get_queryset()
        form_number = self.request.query_params.get('form_number')
        if form_number:
            qs = qs.filter(form_number=form_number)
        return qs


class FormFieldViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for form fields (read-only for API users)

    GET /api/form-fields/ - List all active fields
    GET /api/form-fields/{id}/ - Get field details
    """
    queryset = FormField.objects.filter(is_active=True).order_by('display_order')
    serializer_class = FormFieldSerializer
    permission_classes = [permissions.IsAuthenticated]


class WorkflowFormDataViewSet(viewsets.ViewSet):
    """
    ViewSet for workflow form data submission and retrieval

    GET /api/workflow-form-data/{workflow_id}/ - Get all form data for workflow
    GET /api/workflow-form-data/{workflow_id}/?form_number=X - Get specific form data
    POST /api/workflow-form-data/{workflow_id}/submit/ - Submit form data
    """
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, pk=None):
        """
        Get form data for a workflow
        Query param 'form_number' can filter to specific form
        """
        workflow = get_object_or_404(Workflow, pk=pk)

        # Check permissions
        # TODO: Add permission check using apps.permissions

        form_number = request.query_params.get('form_number')

        if form_number:
            # Get specific form data from workflow._data
            form = get_object_or_404(DynamicForm, form_number=form_number, is_active=True)

            # Get the form data key (e.g., "form1", "form2", "form3")
            form_data_key = f"form{form_number}"
            saved_data = workflow.data.get(form_data_key, {}) if workflow.data else {}

            return Response({
                'workflow_id': str(workflow.pk),
                'form_number': form_number,
                'data': saved_data,
                'submitted_at': workflow.updated_at
            })
        else:
            # Get all form data for workflow
            return Response({
                'workflow_id': str(workflow.pk),
                'data': workflow.data or {},
                'submitted_at': workflow.updated_at
            })

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit form data for a workflow

        Supports both JSON and multipart/form-data (for file uploads)

        JSON Request body:
        {
            "form_number": 1,
            "data": {
                "first_name": "احمد",
                "last_name": "رضایی",
                ...
            }
        }

        Multipart Request body:
        - form_number: 1
        - data: '{"first_name": "احمد", ...}' (JSON string)
        - file_fields: '["form1_address"]' (JSON array of field codes)
        - file_form1_address: <file>
        """
        workflow = get_object_or_404(Workflow, pk=pk)

        # Check permissions
        # TODO: Add permission check using apps.permissions

        # Handle multipart/form-data (file uploads)
        if request.content_type and 'multipart/form-data' in request.content_type:
            form_number = request.POST.get('form_number')
            data = json.loads(request.POST.get('data', '{}'))
            file_fields = json.loads(request.POST.get('file_fields', '[]'))

            # Validate form exists
            if not DynamicForm.objects.filter(form_number=form_number, is_active=True).exists():
                return Response(
                    {'error': f"Form {form_number} not found or inactive"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            form = DynamicForm.objects.get(form_number=form_number, is_active=True)

            # Process uploaded files and save to MinIO
            from django.core.files.storage import default_storage

            for field_code in file_fields:
                file_key = f'file_{field_code}'
                if file_key in request.FILES:
                    uploaded_file = request.FILES[file_key]
                    # Save file to MinIO and store the path in data
                    file_path = default_storage.save(
                        f'workflow_{workflow.id}/forms/form{form_number}/{field_code}/{uploaded_file.name}',
                        uploaded_file
                    )
                    # Store the file URL in the data
                    data[field_code] = default_storage.url(file_path)
        else:
            # Handle JSON (regular form submission)
            form_number = request.data.get('form_number')
            data = request.data.get('data', {})

            if not form_number:
                return Response(
                    {'error': 'form_number is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            form = get_object_or_404(DynamicForm, form_number=form_number, is_active=True)

        with transaction.atomic():
            # Store form data in workflow._data under form{N} key
            form_data_key = f"form{form_number}"
            current_data = workflow.data or {}
            current_data[form_data_key] = data

            # Update workflow data
            workflow.update_data(current_data, merge=False)
            workflow.save()

        return Response(
            {
                'workflow_id': str(workflow.pk),
                'form_number': form_number,
                'data': data,
                'submitted_at': workflow.updated_at
            },
            status=status.HTTP_200_OK
        )
