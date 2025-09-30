# apps/workflows/api/views.py - Updated WorkflowFormViewSet
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from ..models import Workflow
from ..forms.registry import FormRegistry
from ..actions import (
    get_form3_step_info, 
    get_form3_completion_status, 
    can_user_edit_form3_section,
    perform_action
)
from .serializers import FormDataSerializer, WorkflowFormSerializer

class WorkflowFormViewSet(viewsets.ModelViewSet):
    """ViewSet for workflow form operations"""
    
    queryset = Workflow.objects.all()
    serializer_class = WorkflowFormSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get', 'post'], url_path='forms/(?P<form_number>[0-9]+)')
    def form_action(self, request, pk=None, form_number=None):
        """Handle both GET and POST for forms with Form3 special handling"""
        workflow = self.get_object()
        form_number = int(form_number)
        
        form_class = FormRegistry.get_form(form_number)
        if not form_class:
            return Response(
                {"error": f"Form {form_number} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            return self._handle_form_get(workflow, form_number, form_class)
        elif request.method == 'POST':
            return self._handle_form_post(workflow, form_number, form_class, request)
    
    def _handle_form_get(self, workflow, form_number, form_class):
        """Handle GET request for form data"""
        # Extract form data
        form_data = form_class.extract_from_workflow(workflow)
        
        response_data = {
            "form_number": form_number,
            "form_title": form_class.form_title,
            "data": form_data,
            "schema": form_class.get_schema()
        }
        
        # Add Form3 specific metadata
        if form_number == 3 and workflow.state == 'Form3':
            response_data.update(self._get_form3_metadata(workflow))
        
        return Response(response_data)
    
    def _handle_form_post(self, workflow, form_number, form_class, request):
        """Handle POST request for form submission"""
        # Validate form data
        serializer = FormDataSerializer(data={
            "form_number": form_number,
            "data": request.data
        })
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Special handling for Form3
        if form_number == 3 and workflow.state == 'Form3':
            return self._handle_form3_submission(workflow, request)
        
        # Regular form handling
        try:
            workflow.update_from_form(form_number, request.data)
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
    
    def _handle_form3_submission(self, workflow, request):
        """Special handling for Form3 submissions"""
        from ..forms.form_3 import PropertyStatusReviewForm
        
        # Get current step info
        step_info = get_form3_step_info(workflow)
        user_roles = [m.role.code for m in request.user.memberships.all()]
        
        # Check if user can act in current step
        if step_info.get('role') not in user_roles:
            return Response(
                {
                    "error": "insufficient_permissions",
                    "message": f"You need {step_info.get('role')} role to perform this action",
                    "required_role": step_info.get('role'),
                    "current_step": step_info
                },
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Update workflow with form data
        try:
            workflow.update_from_form(3, request.data)
            
            # Check if this submission includes a signature (step completion)
            signature_field = step_info.get('signature_field')
            if signature_field:
                signature_value = self._extract_signature_from_data(request.data, signature_field)
                if signature_value:
                    # Mark this step as completed by performing approval action
                    approval_result = perform_action(
                        workflow=workflow,
                        user=request.user,
                        action_type='APPROVE',
                        data={'signature': signature_value}
                    )
                    
                    # Check if all Form3 steps are completed
                    if approval_result.get('done'):
                        # All Form3 steps completed, ready to advance to next state
                        # This will be handled by the separate approve endpoint
                        pass
            
            # Get updated status
            completion_status = get_form3_completion_status(workflow)
            step_info = get_form3_step_info(workflow)
            
            workflow_serializer = WorkflowFormSerializer(workflow)
            
            return Response({
                "message": "Form3 section submitted successfully",
                "workflow": workflow_serializer.data,
                "form3_status": {
                    "current_step": step_info,
                    "completion_status": completion_status
                }
            })
            
        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _get_form3_metadata(self, workflow):
        """Get Form3 specific metadata for the response"""
        step_info = get_form3_step_info(workflow)
        completion_status = get_form3_completion_status(workflow)
        user_roles = [m.role.code for m in self.request.user.memberships.all()]
        
        # Get editable sections for current user
        editable_sections = {}
        for role in user_roles:
            from ..forms.form_3 import PropertyStatusReviewForm
            role_sections = PropertyStatusReviewForm.get_editable_sections(workflow, role)
            for section, editable in role_sections.items():
                if editable:
                    editable_sections[section] = True
        
        return {
            "form3_metadata": {
                "current_step": step_info,
                "completion_status": completion_status,
                "editable_sections": editable_sections,
                "user_roles": user_roles,
                "can_act_in_current_step": step_info.get('role') in user_roles
            }
        }
    
    def _extract_signature_from_data(self, form_data, signature_field):
        """Extract signature value from nested form data"""
        # Handle nested signature fields like 'legalDeputyReport.headOfContractsSignature'
        parts = signature_field.split('.')
        current_data = form_data
        
        try:
            for part in parts:
                current_data = current_data[part]
            return current_data
        except (KeyError, TypeError):
            return None
    
    @action(detail=True, methods=['get'])
    def form3_status(self, request, pk=None):
        """Get detailed Form3 status and progress"""
        workflow = self.get_object()
        
        if workflow.state != 'Form3':
            return Response(
                {"error": "Workflow is not in Form3 state"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        metadata = self._get_form3_metadata(workflow)
        
        return Response(metadata["form3_metadata"])
    
    @action(detail=True, methods=['post'])
    def form3_approve(self, request, pk=None):
        """Handle Form3 step approval with signature"""
        workflow = self.get_object()
        
        if workflow.state != 'Form3':
            return Response(
                {"error": "Workflow is not in Form3 state"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get signature data from request
        signature = request.data.get('signature')
        if not signature:
            return Response(
                {"error": "Signature is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Perform the approval action
        approval_result = perform_action(
            workflow=workflow,
            user=request.user,
            action_type='APPROVE',
            data={'signature': signature}
        )
        
        if 'error' in approval_result:
            return Response(approval_result, status=status.HTTP_403_FORBIDDEN)
        
        # Get updated status
        completion_status = get_form3_completion_status(workflow)
        step_info = get_form3_step_info(workflow)
        
        return Response({
            "message": "Step approved successfully",
            "approval_result": approval_result,
            "form3_status": {
                "current_step": step_info,
                "completion_status": completion_status
            }
        })
    
    # Keep your existing actions...
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
            Workflow.State.Form3: [3],  # Add Form3
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
        
        # Special handling for Form3
        if form_number == 3 and workflow.state == 'Form3':
            completion_status = get_form3_completion_status(workflow)
            return completion_status.get('is_fully_completed', False)
        
        # Regular form completion check
        form_data = form_class.extract_from_workflow(workflow)
        schema = form_class.get_schema()
        
        required_fields = schema.get('required', [])
        for field in required_fields:
            if not form_data.get(field):
                return False
        
        return True