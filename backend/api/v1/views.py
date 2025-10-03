# backend/api/v1/views.py
"""
Centralized API views for all endpoints
"""
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import viewsets, permissions, decorators, response, status, filters
from rest_framework.response import Response
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend

from apps.workflows.models import (
    Workflow, Attachment, Comment, Action,
    WorkflowTemplate, WorkflowState, WorkflowStateStep, WorkflowTransition
)
from apps.forms.models import DynamicForm, FormField, FormData
from apps.workflows.actions import (
    perform_action, current_step, steps_required, step_roles,
    can_user_satisfy_step, get_workflows_pending_user_action
)
from apps.workflows.workflow_spec import NEXT_STATE
from apps.workflows.forms.registry import FormRegistry

from .serializers import (
    WorkflowListSerializer, WorkflowDetailSerializer, AttachmentSerializer,
    CommentSerializer, ActionSerializer, FormDataSerializer,
    WorkflowFormSerializer, UserSerializer, OrgRoleSerializer,
    WorkflowTemplateSerializer, WorkflowStateSerializer,
    WorkflowStateStepSerializer, WorkflowTransitionSerializer,
    DynamicFormSerializer, FormFieldSerializer, FormSectionSerializer
)
from api.permissions.workflow_permissions import (
    WorkflowPermission, WorkflowApprovalPermission,
    WorkflowTransitionPermission, WorkflowFormPermission
)
from apps.permissions.utils import (
    check_state_permission, check_form_permission,
    get_editable_fields, filter_form_data_by_permissions
)
from apps.permissions.models import PermissionType


# ==================== User & Auth Views ====================

class CurrentUserView(viewsets.ViewSet):
    """View for current user information"""
    permission_classes = [permissions.IsAuthenticated]

    @decorators.action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user information"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)


# ==================== Configurable Workflow Views ====================

class WorkflowTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow templates
    Admins can update template details
    """
    queryset = WorkflowTemplate.objects.filter(is_active=True).order_by('name')
    serializer_class = WorkflowTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        """Only admins can modify templates"""
        if self.action in ['update', 'partial_update', 'destroy', 'create']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()

    @decorators.action(detail=False, methods=['get'])
    def default(self, request):
        """Get the default workflow template"""
        default_template = WorkflowTemplate.objects.filter(
            code='PROPERTY_ACQUISITION',
            is_active=True
        ).first()

        if not default_template:
            default_template = WorkflowTemplate.objects.filter(is_active=True).first()

        if not default_template:
            return Response(
                {'error': 'No active workflow template found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(default_template)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=['get'])
    def states(self, request, pk=None):
        """Get all states for a template"""
        template = self.get_object()
        states = WorkflowState.objects.filter(template=template).order_by('order')
        serializer = WorkflowStateSerializer(states, many=True)
        return Response(serializer.data)


class WorkflowStateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow states
    Allows admins to update state names and descriptions
    """
    queryset = WorkflowState.objects.all().order_by('template', 'order')
    serializer_class = WorkflowStateSerializer
    permission_classes = [permissions.IsAdminUser]

    def get_queryset(self):
        queryset = super().get_queryset()
        template_id = self.request.query_params.get('template')
        if template_id:
            queryset = queryset.filter(template_id=template_id)
        return queryset


# ==================== Dynamic Forms Views ====================

class DynamicFormViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dynamic forms
    Read-only - forms are managed via Django admin
    """
    queryset = DynamicForm.objects.filter(is_active=True).order_by('form_number', 'code')
    serializer_class = DynamicFormSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Filter by form_number if provided"""
        qs = super().get_queryset()
        form_number = self.request.query_params.get('form_number')
        if form_number:
            try:
                form_number = int(form_number)
                qs = qs.filter(form_number=form_number)
                print(f"[DynamicFormViewSet] Filtering by form_number={form_number}, count={qs.count()}")
            except ValueError:
                print(f"[DynamicFormViewSet] Invalid form_number: {form_number}")
        else:
            print(f"[DynamicFormViewSet] No form_number filter, returning all {qs.count()} forms")
        return qs

    @decorators.action(detail=True, methods=['get'])
    def schema(self, request, pk=None):
        """Get form schema with all sections and fields"""
        form = self.get_object()
        schema = form.get_schema()
        return Response(schema)


# ==================== Workflow Views ====================

class WorkflowViewSet(viewsets.ModelViewSet):
    """
    ViewSet for workflow CRUD operations with permission checks
    """
    queryset = Workflow.objects.all().order_by("-created_at")
    permission_classes = [permissions.IsAuthenticated, WorkflowPermission]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['state', 'created_by']
    search_fields = ['title']

    def get_serializer_class(self):
        """Use different serializers for list and detail views"""
        if self.action == 'list':
            return WorkflowListSerializer
        return WorkflowDetailSerializer

    def get_queryset(self):
        """Filter queryset based on user permissions"""
        qs = super().get_queryset()
        user = self.request.user

        # Superusers see everything
        if user.is_superuser:
            return qs

        # Filter by workflows user can view based on permissions
        from apps.permissions.utils import get_user_roles
        from apps.permissions.models import StatePermission, PermissionType

        user_roles = get_user_roles(user)

        # Get all states where user has VIEW permission
        user_view_all_states = set()
        user_view_own_states = set()

        # User-specific permissions
        user_perms = StatePermission.objects.filter(
            permission_type=PermissionType.VIEW,
            user=user,
            is_active=True
        ).values_list('state', 'restrict_to_own')

        for state, restrict_to_own in user_perms:
            if restrict_to_own:
                user_view_own_states.add(state)
            else:
                user_view_all_states.add(state)

        # Role-based permissions
        if user_roles:
            role_perms = StatePermission.objects.filter(
                permission_type=PermissionType.VIEW,
                role__code__in=user_roles,
                is_active=True
            ).values_list('state', 'restrict_to_own')

            for state, restrict_to_own in role_perms:
                if restrict_to_own:
                    user_view_own_states.add(state)
                else:
                    user_view_all_states.add(state)

        # Build filter query
        q_objects = Q()

        # States where user can view all workflows
        if user_view_all_states:
            q_objects |= Q(state__in=user_view_all_states)

        # States where user can only view their own workflows
        if user_view_own_states:
            q_objects |= Q(state__in=user_view_own_states, created_by=user)

        # Apply permission filter
        if q_objects:
            qs = qs.filter(q_objects)
        else:
            # If no permissions, return empty queryset
            qs = qs.none()

        # Custom search filters
        search = self.request.query_params.get('search', '').strip()
        applicant_name = self.request.query_params.get('applicant_name', '').strip()
        applicant_national_id = self.request.query_params.get('applicant_national_id', '').strip()

        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(_data__contains=f'"firstName":"{search}"') |
                Q(_data__contains=f'"lastName":"{search}"') |
                Q(_data__contains=f'"nationalCode":"{search}"')
            )

        if applicant_name:
            qs = qs.filter(
                Q(_data__contains=f'"firstName":"{applicant_name}"') |
                Q(_data__contains=f'"lastName":"{applicant_name}"')
            )

        if applicant_national_id:
            qs = qs.filter(_data__contains=f'"nationalCode":"{applicant_national_id}"')

        # Date filtering
        if date_from := self.request.query_params.get('date_from'):
            qs = qs.filter(created_at__gte=date_from)
        if date_to := self.request.query_params.get('date_to'):
            qs = qs.filter(created_at__lte=date_to)

        return qs

    def perform_create(self, serializer):
        """Create workflow with initial data - model's save() assigns template automatically"""
        applicant_name = self.request.data.get('applicant_name', '')
        applicant_national_id = self.request.data.get('applicant_national_id', '')

        # Create workflow - model's save() method will auto-assign template and state
        workflow = serializer.save(created_by=self.request.user)

        # Initialize data field
        if applicant_name or applicant_national_id:
            initial_data = {}

            if applicant_name:
                name_parts = applicant_name.strip().split(' ', 1)
                initial_data['personalInformation'] = {
                    'firstName': name_parts[0] if name_parts else '',
                    'lastName': name_parts[1] if len(name_parts) > 1 else '',
                }
                if applicant_national_id:
                    initial_data['personalInformation']['nationalCode'] = applicant_national_id

            workflow.data = initial_data
            workflow.save(update_fields=['_data'])

    def list(self, request, *args, **kwargs):
        """List workflows with permission metadata"""
        response_data = super().list(request, *args, **kwargs)

        # Add permission metadata to each workflow
        if hasattr(response_data, 'data') and 'results' in response_data.data:
            for workflow_data in response_data.data['results']:
                self._add_permission_metadata(request.user, workflow_data)

        return response_data

    def retrieve(self, request, *args, **kwargs):
        """Retrieve workflow with permission metadata"""
        response_data = super().retrieve(request, *args, **kwargs)
        workflow = self.get_object()

        # Add permission metadata
        self._add_permission_metadata(request.user, response_data.data, workflow)

        return response_data

    def _add_permission_metadata(self, user, workflow_data, workflow=None):
        """Add permission and workflow metadata to response"""
        workflow_id = workflow_data.get('id')

        if not workflow:
            try:
                workflow = Workflow.objects.get(id=workflow_id)
            except Workflow.DoesNotExist:
                return

        # Add approval information
        cur = current_step(workflow)
        total = steps_required(workflow.state)

        workflow_data['can_view'] = check_state_permission(user, workflow, PermissionType.VIEW)
        workflow_data['can_edit'] = check_state_permission(user, workflow, PermissionType.EDIT)
        workflow_data['can_approve'] = False
        workflow_data['can_transition'] = check_state_permission(user, workflow, PermissionType.TRANSITION)
        workflow_data['can_delete'] = check_state_permission(user, workflow, PermissionType.DELETE)

        if cur < total:
            workflow_data['can_approve'] = can_user_satisfy_step(user, workflow.state, cur)

        workflow_data['pending_step'] = cur if cur < total else None
        workflow_data['total_steps_in_state'] = total
        workflow_data['pending_step_roles'] = step_roles(workflow.state, cur) if cur < total else []

    @decorators.action(detail=True, methods=["get"])
    def status(self, request, pk=None):
        """Get detailed workflow status"""
        workflow = self.get_object()
        cur = current_step(workflow)
        total = steps_required(workflow.state)

        can_approve = False
        if cur < total:
            can_approve = can_user_satisfy_step(request.user, workflow.state, cur)

        from apps.accounts.utils import user_role_codes
        user_roles = user_role_codes(request.user)

        # Get required approver info
        required_approver = None
        if cur < total:
            needed_roles = step_roles(workflow.state, cur)
            if needed_roles:
                # Get the first required role info
                from apps.accounts.models import OrgRole
                role_code = needed_roles[0]
                try:
                    role = OrgRole.objects.get(code=role_code)
                    required_approver = {
                        'role_code': role.code,
                        'role_name_fa': role.name_fa,
                        'step_index': cur,
                        'step_name_fa': f"مرحله {cur + 1} از {total}"
                    }
                except OrgRole.DoesNotExist:
                    required_approver = {
                        'role_code': role_code,
                        'role_name_fa': role_code,
                        'step_index': cur,
                        'step_name_fa': f"مرحله {cur + 1} از {total}"
                    }

        return Response({
            "state": workflow.state,
            "next_step_index": cur if cur < total else None,
            "needed_roles": step_roles(workflow.state, cur) if cur < total else [],
            "user_roles": user_roles,
            "steps_total": total,
            "can_approve": can_approve,
            "will_auto_advance_on_next": (cur + 1 == total),
            "next_state_if_complete": NEXT_STATE.get(workflow.state),
            "required_approver": required_approver,
        })

    @decorators.action(detail=False, methods=["get"])
    def inbox(self, request):
        """Get workflows pending current user's action"""
        pending_workflows = get_workflows_pending_user_action(request.user)
        serializer = self.get_serializer(pending_workflows, many=True)

        # Add context for each workflow
        for i, workflow in enumerate(pending_workflows):
            cur_step = current_step(workflow)
            total_steps = steps_required(workflow.state)

            serializer.data[i].update({
                'pending_step': cur_step,
                'pending_step_roles': step_roles(workflow.state, cur_step),
                'total_steps_in_state': total_steps,
                'urgency': 'high' if workflow.state in ['ApplicantRequest', 'CEOInstruction'] else 'medium',
                'can_approve': can_user_satisfy_step(request.user, workflow.state, cur_step),
            })

        return Response(serializer.data)

    @decorators.action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, WorkflowApprovalPermission]
    )
    def approve(self, request, pk=None):
        """Approve workflow at current step"""
        workflow = self.get_object()

        result = perform_action(workflow, request.user, Action.ActionType.APPROVE, request.data)

        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Auto-transition if all steps complete
        if result.get("done"):
            transition_successful = workflow.advance_to_next_state(by=request.user)
            if transition_successful:
                # No need to refresh - advance_to_next_state already updates the state
                result["state"] = workflow.state
                result["transitioned"] = True
            else:
                result["transition_failed"] = True

        return Response(result, status=status.HTTP_200_OK)

    @decorators.action(
        detail=True,
        methods=["post"],
        permission_classes=[permissions.IsAuthenticated, WorkflowTransitionPermission]
    )
    def transition(self, request, pk=None):
        """Manually trigger state transition"""
        workflow = self.get_object()

        transition_successful = workflow.advance_to_next_state(by=request.user)

        if transition_successful:
            # No need to refresh - advance_to_next_state already updates the state
            return Response({
                "success": True,
                "new_state": workflow.state
            })
        else:
            return Response({
                "error": "transition_failed",
                "message": "Cannot transition workflow at this time"
            }, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=["post"])
    def perform_action(self, request, pk=None):
        """Perform generic action on workflow"""
        workflow = self.get_object()
        action_type = request.data.get("action")

        if not action_type:
            return Response(
                {"error": "invalid_action", "message": "Action type is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        result = perform_action(workflow, request.user, action_type, request.data)

        if "error" in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Auto-transition for approvals
        if action_type == Action.ActionType.APPROVE and result.get("done"):
            transition_successful = workflow.advance_to_next_state(by=request.user)
            if transition_successful:
                # No need to refresh - advance_to_next_state already updates the state
                result["state"] = workflow.state
                result["transitioned"] = True

        return Response(result, status=status.HTTP_200_OK)

    @decorators.action(detail=False, methods=["get"])
    def stats(self, request):
        """Get dashboard statistics"""
        total_letters = Workflow.objects.count()
        pending_letters = Workflow.objects.exclude(state='Settlment').count()

        today = timezone.now().date()
        completed_today = Workflow.objects.filter(
            state='Settlment',
            updated_at__date=today
        ).count()

        pending_my_action = len(get_workflows_pending_user_action(request.user))

        return Response({
            'total_letters': total_letters,
            'pending_letters': pending_letters,
            'completed_today': completed_today,
            'avg_processing_time': 3.5,  # Mock value
            'pending_my_action': pending_my_action
        })

    @decorators.action(detail=False, methods=["get"])
    def reports(self, request):
        """Get user's workflow processing reports"""
        from django.db.models import Count, Q, Avg
        from datetime import timedelta

        user = request.user

        # Get workflows user has acted on
        user_actions = Action.objects.filter(performer=user).values_list('workflow_id', flat=True).distinct()
        user_workflows = Workflow.objects.filter(id__in=user_actions)

        # Overall stats
        total_processed = user_workflows.count()
        completed = user_workflows.filter(state='Settlment').count()
        in_progress = user_workflows.exclude(state='Settlment').count()

        # State distribution
        state_stats = user_workflows.values('state').annotate(count=Count('id')).order_by('-count')

        # Activity over time (last 30 days)
        # MongoDB doesn't support .extra() with raw SQL, so we'll aggregate by day using Python
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_actions_qs = Action.objects.filter(
            performer=user,
            created_at__gte=thirty_days_ago
        ).order_by('created_at')

        # Group by date in Python
        from collections import defaultdict
        actions_by_date = defaultdict(int)
        for action in recent_actions_qs:
            date_str = action.created_at.date().isoformat()
            actions_by_date[date_str] += 1

        recent_actions = [
            {'date': date, 'count': count}
            for date, count in sorted(actions_by_date.items())
        ]

        # Action type breakdown
        action_types = Action.objects.filter(performer=user).values('action_type').annotate(
            count=Count('id')
        ).order_by('-count')

        # Recent workflows
        recent_workflows = user_workflows.order_by('-updated_at')[:10]
        recent_workflows_data = WorkflowListSerializer(recent_workflows, many=True).data

        return Response({
            'summary': {
                'total_processed': total_processed,
                'completed': completed,
                'in_progress': in_progress,
                'completion_rate': round((completed / total_processed * 100) if total_processed > 0 else 0, 1)
            },
            'by_state': list(state_stats),
            'activity_timeline': recent_actions,
            'by_action_type': list(action_types),
            'recent_workflows': recent_workflows_data
        })

    @decorators.action(detail=True, methods=["get"])
    def actions(self, request, pk=None):
        """Get all actions for workflow"""
        workflow = self.get_object()
        actions = Action.objects.filter(workflow=workflow).order_by('-created_at')
        serializer = ActionSerializer(actions, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=["get"])
    def comments(self, request, pk=None):
        """Get all comments for workflow"""
        workflow = self.get_object()
        comments = Comment.objects.filter(workflow=workflow).order_by('-created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    @decorators.action(detail=True, methods=["get"])
    def available_transitions(self, request, pk=None):
        """Get available transitions for workflow (configurable workflows only)"""
        workflow = self.get_object()

        if not workflow.is_configurable():
            return Response({
                "error": "not_configurable",
                "message": "This workflow uses the legacy FSM system and doesn't support dynamic transitions"
            }, status=status.HTTP_400_BAD_REQUEST)

        transitions = workflow.get_available_transitions(request.user)

        # Serialize transition data
        transitions_data = []
        for transition in transitions:
            transitions_data.append({
                'id': str(transition.id),
                'name': transition.name,
                'name_fa': transition.name_fa,
                'from_state': {
                    'id': str(transition.from_state.id),
                    'code': transition.from_state.code,
                    'name_fa': transition.from_state.name_fa,
                },
                'to_state': {
                    'id': str(transition.to_state.id),
                    'code': transition.to_state.code,
                    'name_fa': transition.to_state.name_fa,
                    'state_type': transition.to_state.state_type,
                },
                'condition_type': transition.condition_type,
                'is_automatic': transition.is_automatic,
                'condition_met': transition.check_condition(workflow),
            })

        return Response({
            'workflow_id': str(workflow.id),
            'current_state': {
                'id': str(workflow.current_state.id),
                'code': workflow.current_state.code,
                'name_fa': workflow.current_state.name_fa,
            },
            'transitions': transitions_data,
        })

    @decorators.action(detail=True, methods=["post"])
    def perform_transition(self, request, pk=None):
        """Perform a specific transition (configurable workflows only)"""
        workflow = self.get_object()

        if not workflow.is_configurable():
            return Response({
                "error": "not_configurable",
                "message": "This workflow uses the legacy FSM system"
            }, status=status.HTTP_400_BAD_REQUEST)

        transition_id = request.data.get('transition_id')
        if not transition_id:
            return Response({
                "error": "transition_id_required",
                "message": "transition_id is required"
            }, status=status.HTTP_400_BAD_REQUEST)

        from apps.workflows.models import WorkflowTransition
        try:
            transition = WorkflowTransition.objects.get(
                id=transition_id,
                template=workflow.template,
                from_state=workflow.current_state
            )
        except WorkflowTransition.DoesNotExist:
            return Response({
                "error": "invalid_transition",
                "message": "Transition not found or not valid for current state"
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if user can perform this transition
        if not workflow.can_transition_to(request.user, transition.to_state):
            return Response({
                "error": "permission_denied",
                "message": "You don't have permission to perform this transition"
            }, status=status.HTTP_403_FORBIDDEN)

        # Perform the transition
        try:
            workflow.perform_configurable_transition(transition, by=request.user)
            # No need to refresh - perform_configurable_transition already updates the state

            return Response({
                "success": True,
                "new_state": {
                    'id': str(workflow.current_state.id),
                    'code': workflow.current_state.code,
                    'name_fa': workflow.current_state.name_fa,
                },
                "message": "Transition completed successfully"
            })
        except ValueError as e:
            return Response({
                "error": "transition_failed",
                "message": str(e)
            }, status=status.HTTP_400_BAD_REQUEST)

    @decorators.action(detail=True, methods=["get"])
    def workflow_info(self, request, pk=None):
        """Get detailed workflow information including configurable workflow data"""
        workflow = self.get_object()

        response_data = {
            'id': str(workflow.id),
            'title': workflow.title,
            'state': workflow.state,
            'is_configurable': workflow.is_configurable(),
            'created_by': workflow.created_by.username,
            'created_at': workflow.created_at,
            'updated_at': workflow.updated_at,
        }

        if workflow.is_configurable():
            # Get all form states from the template
            from apps.workflows.models import StateType
            form_states = WorkflowState.objects.filter(
                template=workflow.template,
                state_type=StateType.FORM
            ).order_by('order')

            form_states_data = []
            for state in form_states:
                form_states_data.append({
                    'id': str(state.id),
                    'code': state.code,
                    'name': state.name,
                    'name_fa': state.name_fa,
                    'form_number': state.form_number,
                    'order': state.order,
                })

            response_data['configurable'] = {
                'template': {
                    'id': str(workflow.template.id),
                    'code': workflow.template.code,
                    'name': workflow.template.name,
                    'name_fa': workflow.template.name_fa,
                },
                'current_state': {
                    'id': str(workflow.current_state.id),
                    'code': workflow.current_state.code,
                    'name': workflow.current_state.name,
                    'name_fa': workflow.current_state.name_fa,
                    'state_type': workflow.current_state.state_type,
                    'form_number': workflow.current_state.form_number,
                },
                'current_step': workflow.current_step,
                'steps_required': workflow.current_state.get_required_steps_count(),
                'all_steps_approved': workflow.are_all_steps_approved(),
                'completed_steps': workflow.completed_steps,
                'form_states': form_states_data,
            }

        return Response(response_data)


class WorkflowFormViewSet(viewsets.ViewSet):
    """
    ViewSet for workflow form operations with permission checks
    """
    permission_classes = [permissions.IsAuthenticated, WorkflowFormPermission]

    def retrieve(self, request, pk=None):
        """Get form data for workflow"""
        workflow = get_object_or_404(Workflow, pk=pk)
        self.check_object_permissions(request, workflow)

        form_number = request.query_params.get('form_number')
        if not form_number:
            return Response(
                {"error": "form_number required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            form_number = int(form_number)
        except ValueError:
            return Response(
                {"error": "invalid form_number"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get form data
        form_data = workflow.get_form_data(form_number)

        # Filter by permissions
        filtered_data = filter_form_data_by_permissions(
            request.user, form_number, form_data,
            state=workflow.state, workflow=workflow,
            permission_type=PermissionType.VIEW
        )

        # Get editable fields
        editable_fields = get_editable_fields(
            request.user, form_number,
            state=workflow.state, workflow=workflow
        )

        return Response({
            'workflow_id': str(workflow.pk),
            'form_number': form_number,
            'data': filtered_data,
            'editable_fields': editable_fields,
            'can_edit': check_form_permission(
                request.user, form_number, PermissionType.EDIT,
                workflow.state, workflow
            )
        })

    @decorators.action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit form data for workflow"""
        workflow = get_object_or_404(Workflow, pk=pk)
        self.check_object_permissions(request, workflow)

        serializer = FormDataSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        form_number = serializer.validated_data['form_number']
        form_data = serializer.validated_data['data']

        # Check edit permission
        if not check_form_permission(
            request.user, form_number, PermissionType.EDIT,
            workflow.state, workflow
        ):
            return Response(
                {"error": "Permission denied"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update workflow with form data
        workflow.update_from_form(form_number, form_data)

        return Response({
            "success": True,
            "workflow_id": str(workflow.pk),
            "form_number": form_number
        })


# ==================== Attachment Views ====================

class AttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for workflow attachments"""
    serializer_class = AttachmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Attachment.objects.all()

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)


# ==================== Comment Views ====================

class CommentViewSet(viewsets.ModelViewSet):
    """ViewSet for workflow comments"""
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Comment.objects.all()

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


# ==================== Action Views ====================

class ActionViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for workflow actions"""
    serializer_class = ActionSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = Action.objects.all().order_by('-created_at')
