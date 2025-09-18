# apps/workflows/api.py - IMPROVED VERSION

from django.db.models import Count
from rest_framework import viewsets, permissions, decorators, response, status, filters
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import Workflow, Attachment, Comment, Action
from .serializers import WorkflowSerializer, AttachmentSerializer, CommentSerializer, ActionSerializer
from .actions import perform_action, current_step, steps_required, step_roles, can_user_satisfy_step, get_workflows_pending_user_action
from .workflow_spec import NEXT_STATE
from django_filters.rest_framework import DjangoFilterBackend
from . import actions

class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all().order_by("-created_at")
    serializer_class = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['state', 'created_by']
    search_fields = ['title', 'applicant_name', 'applicant_national_id']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()

        # Additional custom filtering
        if state := self.request.query_params.get('state'):
            qs = qs.filter(state=state)
        if date_from := self.request.query_params.get('date_from'):
            qs = qs.filter(created_at__gte=date_from)
        if date_to := self.request.query_params.get('date_to'):
            qs = qs.filter(created_at__lte=date_to)

        # ✅ NEW: Handle can_approve parameter properly
        if self.request.query_params.get('can_approve'):
            # Filter to only workflows where the current user can perform the next action
            pending_workflows = get_workflows_pending_user_action(self.request.user)
            pending_ids = [wf.id for wf in pending_workflows]
            qs = qs.filter(id__in=pending_ids)

        return qs

    # ✅ IMPROVED: Add can_approve to the serializer data
    def get_serializer(self, *args, **kwargs):
        serializer = super().get_serializer(*args, **kwargs)
        return serializer

    def list(self, request, *args, **kwargs):
        """Override list to add can_approve field to each workflow"""
        response_data = super().list(request, *args, **kwargs)
        
        # Add can_approve field to each workflow in the response
        if hasattr(response_data, 'data') and 'results' in response_data.data:
            for workflow_data in response_data.data['results']:
                workflow_id = workflow_data.get('id')
                if workflow_id:
                    try:
                        workflow = Workflow.objects.get(id=workflow_id)
                        cur = current_step(workflow)
                        total = steps_required(workflow.state)
                        can_approve = False
                        if cur < total:
                            can_approve = can_user_satisfy_step(request.user, workflow.state, cur)
                        workflow_data['can_approve'] = can_approve
                        
                        # ✅ BONUS: Add additional useful fields
                        workflow_data['pending_step'] = cur if cur < total else None
                        workflow_data['total_steps_in_state'] = total
                        workflow_data['pending_step_roles'] = step_roles(workflow.state, cur) if cur < total else []
                    except Workflow.DoesNotExist:
                        workflow_data['can_approve'] = False
        
        return response_data

    def retrieve(self, request, *args, **kwargs):
        """Override retrieve to add can_approve field"""
        response_data = super().retrieve(request, *args, **kwargs)
        
        # Add can_approve field to the workflow
        workflow = self.get_object()
        cur = current_step(workflow)
        total = steps_required(workflow.state)
        can_approve = False
        if cur < total:
            can_approve = can_user_satisfy_step(request.user, workflow.state, cur)
        
        response_data.data['can_approve'] = can_approve
        response_data.data['pending_step'] = cur if cur < total else None
        response_data.data['total_steps_in_state'] = total
        response_data.data['pending_step_roles'] = step_roles(workflow.state, cur) if cur < total else []
        
        return response_data

    @decorators.action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        obj = self.get_object()
        cur = current_step(obj)
        total = steps_required(obj.state)

        # ✅ IMPROVED: More detailed approval checking
        can_approve = False
        user_roles = []
        needed_roles = []
        
        if cur < total:
            can_approve = can_user_satisfy_step(request.user, obj.state, cur)
            needed_roles = step_roles(obj.state, cur)
            from apps.accounts.utils import user_role_codes
            user_roles = user_role_codes(request.user)

        data = {
            "state": obj.state,
            "next_step_index": cur if cur < total else None,
            "needed_roles": needed_roles,
            "user_roles": user_roles,  # ✅ NEW: Show user's roles for debugging
            "steps_total": total,
            "can_approve": can_approve,
            "will_auto_advance_on_next": (cur + 1 == total),
            "next_state_if_complete": NEXT_STATE.get(obj.state),
        }
        return response.Response(data)

    @decorators.action(detail=False, methods=["get"])
    def inbox(self, request):
        """Get workflows pending current user's action"""
        pending_workflows = get_workflows_pending_user_action(request.user)
        serializer = self.get_serializer(pending_workflows, many=True)

        # Add additional context for each workflow
        for i, workflow in enumerate(pending_workflows):
            cur_step = current_step(workflow)
            total_steps = steps_required(workflow.state)
            
            # ✅ IMPROVED: Actually verify can_approve instead of blindly setting True
            can_approve = can_user_satisfy_step(request.user, workflow.state, cur_step)
            
            serializer.data[i].update({
                'pending_step': cur_step,
                'pending_step_roles': step_roles(workflow.state, cur_step),
                'total_steps_in_state': total_steps,
                'urgency': 'high' if workflow.state in ['ApplicantRequest', 'CEOInstruction'] else 'medium',
                'can_approve': can_approve,  # ✅ NOW PROPERLY CALCULATED
            })

        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["post"])
    def perform_action(self, request, pk=None):
        wf = self.get_object()
        action_type = request.data.get("action")
        
        if not action_type:
            return response.Response(
                {"error": "invalid_action", "message": "Action type is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        result = perform_action(wf, request.user, action_type, request.data)
        
        if "error" in result:
            return response.Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        # ✅ THIS WAS MISSING! Add state transition when workflow is complete
        if result.get("done"):
            transition_successful = wf.advance_to_next_state(by=request.user)
            if transition_successful:
                wf.save(update_fields=["state"])
                result["state"] = wf.state  # Return new state
                result["transitioned"] = True
            else:
                result["transition_failed"] = True
        
        return response.Response(result, status=status.HTTP_200_OK)

    # ✅ IMPROVED: Better action endpoint for approvals specifically
    @decorators.action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Dedicated approval endpoint"""
        workflow = self.get_object()
        
        # Check if user can approve
        cur = current_step(workflow)
        total = steps_required(workflow.state)
        
        if cur >= total:
            return response.Response(
                {"error": "workflow_complete", "message": "Workflow is already complete"},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        if not can_user_satisfy_step(request.user, workflow.state, cur):
            needed_roles = step_roles(workflow.state, cur)
            return response.Response(
                {"error": "forbidden", "message": f"You need one of these roles: {needed_roles}"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        result = perform_action(workflow, request.user, "APPROVE", request.data)
        
        if "error" in result:
            return response.Response(result, status=status.HTTP_400_BAD_REQUEST)
        
        return response.Response(result, status=status.HTTP_200_OK)

    @decorators.action(detail=False, methods=["get"])
    def stats(self, request):
        """Get dashboard statistics"""
        # Total letters
        total_letters = Workflow.objects.count()
        
        # Pending letters (not completed)
        pending_letters = Workflow.objects.exclude(state='Settlment').count()
        
        # Completed today
        today = timezone.now().date()
        completed_today = Workflow.objects.filter(
            state='Settlment',
            updated_at__date=today
        ).count()
        
        # Calculate average processing time (mock for now)
        avg_processing_time = 3.5
        
        # Pending user action (mock calculation)
        pending_my_action = Workflow.objects.filter(
            # Add your logic for letters pending user action
        ).count()
        
        return response.Response({
            'total_letters': total_letters,
            'pending_letters': pending_letters,
            'completed_today': completed_today,
            'avg_processing_time': avg_processing_time,
            'pending_my_action': pending_my_action
        })

    @decorators.action(detail=True, methods=["get"])
    def actions(self, request, pk=None):
        """Get all actions for a specific workflow"""
        workflow = self.get_object()
        actions = Action.objects.filter(workflow=workflow).order_by('-created_at')
        serializer = ActionSerializer(actions, many=True)
        return response.Response(serializer.data)

    @decorators.action(detail=True, methods=["get"])
    def comments(self, request, pk=None):
        """Get all comments for a specific workflow"""
        workflow = self.get_object()
        comments = Comment.objects.filter(workflow=workflow).order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return response.Response(serializer.data)


class AttachmentViewSet(viewsets.ModelViewSet):
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Attachment.objects.filter(workflow__created_by=self.request.user)


# New CommentViewSet
class CommentViewSet(viewsets.ModelViewSet):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.filter(author=self.request.user)


# New ActionViewSet (read-only)
class ActionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ActionSerializer  # New serializer needed
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Action.objects
