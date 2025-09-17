# apps/workflows/api.py
from django.db.models import Count
from rest_framework import viewsets, permissions, decorators, response, status,filters
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import Workflow, Attachment, Comment , Action
from .serializers import WorkflowSerializer, AttachmentSerializer, CommentSerializer,ActionSerializer
from .actions import perform_action, current_step, steps_required, step_roles
from .workflow_spec import NEXT_STATE
from django_filters.rest_framework import DjangoFilterBackend
from . import actions  # the file above



class WorkflowViewSet(viewsets.ModelViewSet):
    queryset = Workflow.objects.all().order_by("-created_at")
    serializer_class = WorkflowSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['state', 'created_by']
    search_fields = ['title', 'applicant_name', 'applicant_national_id']  # These fields need to be added to model

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

        return qs

    @decorators.action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        obj = self.get_object()
        cur = current_step(obj)
        total = steps_required(obj.state)

        # Check if current user can approve the next step
        from .actions import can_user_satisfy_step
        can_approve = False
        if cur < total:
            can_approve = can_user_satisfy_step(request.user, obj.state, cur)

        data = {
            "state": obj.state,
            "next_step_index": cur if cur < total else None,
            "needed_roles": (step_roles(obj.state, cur) if cur < total else []),
            "steps_total": total,
            "can_approve": can_approve,  # Add this
            "will_auto_advance_on_next": (cur + 1 == total),
            "next_state_if_complete": NEXT_STATE.get(obj.state),
        }
        return response.Response(data)

    @decorators.action(detail=True, methods=["post"])
    def perform_action(self, request, pk=None):
        wf = self.get_object()
        kind = request.data.get("action")  # e.g., "APPROVE", "COMMENT", etc.
        
        # Validate action type
        if not kind:
            return Response(
                {"error": "missing_action", "message": "Action type is required"}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        result = actions.perform_action(wf, request.user, kind, data=request.data)

        if result.get("error") == "forbidden":
            return Response(result, status=status.HTTP_403_FORBIDDEN)
        
        if result.get("error") == "invalid_action":
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Only advance when the *last* approval of this state is completed
        if result.get("done"):
            # Your FSM transition method name; keep 'by' if your transitions expect it
            wf.advance_to_next_state(by=request.user)
            wf.save(update_fields=["state"])  # ensure persisted if transition changes state
            result["state"] = wf.state  # return post-transition state

        return Response(result, status=status.HTTP_200_OK)

    @decorators.action(detail=True, methods=["post"], serializer_class=AttachmentSerializer)
    def add_attachment(self, request, pk=None):
        workflow = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(workflow=workflow, uploaded_by=request.user)
        perform_action(workflow, request.user, Action.ActionType.UPLOAD)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=True, methods=["post"], serializer_class=CommentSerializer)
    def add_comment(self, request, pk=None):
        workflow = self.get_object()
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(workflow=workflow, author=request.user)
        perform_action(workflow, request.user, Action.ActionType.COMMENT)
        return response.Response(serializer.data, status=status.HTTP_201_CREATED)

    @decorators.action(detail=False, methods=["get"])
    def inbox(self, request):
        """Get workflows pending current user's action"""
        from .actions import get_workflows_pending_user_action

        pending_workflows = get_workflows_pending_user_action(request.user)
        serializer = self.get_serializer(pending_workflows, many=True)

        # Add additional context for each workflow
        for i, workflow in enumerate(pending_workflows):
            cur_step = current_step(workflow)
            total_steps = steps_required(workflow.state)
            serializer.data[i].update({
                'pending_step': cur_step,
                'pending_step_roles': step_roles(workflow.state, cur_step),
                'total_steps_in_state': total_steps,
                'urgency': 'high' if workflow.state in ['ApplicantRequest', 'CEOInstruction'] else 'medium',
                'can_approve': True,  # User can approve since this is their inbox
            })

        return response.Response(serializer.data)

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
