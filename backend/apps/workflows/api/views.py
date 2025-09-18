# apps/workflows/api/views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from ..models import Workflow
from ..forms.registry import FormRegistry
from .serializers import FormDataSerializer, WorkflowFormSerializer

class WorkflowFormViewSet(viewsets.ModelViewSet):
    """ViewSet for workflow form operations"""
    
    queryset = Workflow.objects.all()
    serializer_class = WorkflowFormSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'], url_path='forms/(?P<form_number>[0-9]+)')
    def get_form(self, request, pk=None, form_number=None):
        """Get form data for a specific form"""
        workflow = self.get_object()
        form_number = int(form_number)
        
        form_class = FormRegistry.get_form(form_number)
        if not form_class:
            return Response(
                {"error": f"Form {form_number} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Extract form data
        form_data = form_class.extract_from_workflow(workflow)
        
        return Response({
            "form_number": form_number,
            "form_title": form_class.form_title,
            "data": form_data,
            "schema": form_class.get_schema()
        })
    
    @action(detail=True, methods=['post'], url_path='forms/(?P<form_number>[0-9]+)')
    def submit_form(self, request, pk=None, form_number=None):
        """Submit form data"""
        workflow = self.get_object()
        form_number = int(form_number)
        
        form_class = FormRegistry.get_form(form_number)
        if not form_class:
            return Response(
                {"error": f"Form {form_number} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Validate form data
        serializer = FormDataSerializer(data={
            "form_number": form_number,
            "data": request.data
        })
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Update workflow
        try:
            workflow.update_from_form(form_number, request.data)
            
            # Serialize updated workflow
            workflow_serializer = WorkflowFormSerializer(workflow)
            
            return Response({
                "message": "Form submitted successfully",
                "workflow": workflow_serializer.data
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def forms_metadata(self, request):
        """Get metadata for all available forms"""
        forms_data = {}
        
        for form_number, form_class in FormRegistry.get_all_forms().items():
            forms_data[form_number] = {
                "form_number": form_number,
                "form_title": form_class.form_title,
                "schema": form_class.get_schema()
            }
        
        return Response(forms_data)
    
    @action(detail=True, methods=['get'])
    def available_forms(self, request, pk=None):
        """Get available forms for current workflow state"""
        workflow = self.get_object()
        
        # Define which forms are available in which states
        state_forms = {
            Workflow.State.Form1: [1],
            Workflow.State.Form2: [2],
            # Add more mappings as needed
        }
        
        available_form_numbers = state_forms.get(workflow.state, [])
        available_forms = {}
        
        for form_number in available_form_numbers:
            form_class = FormRegistry.get_form(form_number)
            if form_class:
                available_forms[form_number] = {
                    "form_number": form_number,
                    "form_title": form_class.form_title,
                    "can_edit": True,  # Add permission logic here
                    "is_completed": self._is_form_completed(workflow, form_number)
                }
        
        return Response({
            "workflow_state": workflow.state,
            "available_forms": available_forms
        })
    
    def _is_form_completed(self, workflow, form_number):
        """Check if a form is completed (has required data)"""
        form_class = FormRegistry.get_form(form_number)
        if not form_class:
            return False
        
        form_data = form_class.extract_from_workflow(workflow)
        schema = form_class.get_schema()
        
        # Simple check for required fields
        required_fields = schema.get('required', [])
        for field in required_fields:
            if not form_data.get(field):
                return False
        
        return True
