# api/v1/permission_views.py
"""
API views for simplified permission management.
Provides admin interface for managing workflow state-step permissions.
"""
from rest_framework import viewsets, decorators, status
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from apps.permissions.models_simplified import (
    WorkflowState,
    WorkflowStateStep,
    WorkflowStateStepPermission,
    WorkflowStepCompletion,
    StepPermissionOverride,
)
from apps.accounts.models import OrgRole
from django.contrib.auth import get_user_model

User = get_user_model()


class WorkflowStateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow states.
    Admin only.
    """
    permission_classes = [IsAdminUser]
    queryset = WorkflowState.objects.all().order_by('order')

    def list(self, request):
        """List all workflow states with their steps"""
        states = self.get_queryset()

        data = []
        for state in states:
            steps = state.steps.filter(is_active=True).order_by('step_number')

            steps_data = []
            for step in steps:
                permissions = step.step_permissions.filter(is_active=True)

                roles = []
                users = []
                for perm in permissions:
                    if perm.role:
                        roles.append({
                            'id': str(perm.role.id),
                            'code': perm.role.code,
                            'name_fa': perm.role.name_fa
                        })
                    if perm.user:
                        users.append({
                            'id': str(perm.user.id),
                            'username': perm.user.username
                        })

                steps_data.append({
                    'id': str(step.id),
                    'step_number': step.step_number,
                    'name_en': step.name_en,
                    'name_fa': step.name_fa,
                    'description_fa': step.description_fa,
                    'action_type': step.action_type,
                    'signature_field': step.signature_field,
                    'requires_all_approvers': step.requires_all_approvers,
                    'roles': roles,
                    'users': users,
                    'is_active': step.is_active,
                })

            data.append({
                'id': str(state.id),
                'code': state.code,
                'name_en': state.name_en,
                'name_fa': state.name_fa,
                'form_number': state.form_number,
                'form_section': state.form_section,
                'order': state.order,
                'is_active': state.is_active,
                'steps': steps_data,
            })

        return Response(data)

    @decorators.action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary statistics for permissions"""
        total_states = WorkflowState.objects.filter(is_active=True).count()
        total_steps = WorkflowStateStep.objects.filter(is_active=True).count()
        total_permissions = WorkflowStateStepPermission.objects.filter(is_active=True).count()

        return Response({
            'total_states': total_states,
            'total_steps': total_steps,
            'total_permissions': total_permissions,
        })


class WorkflowStateStepViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing workflow state steps.
    Admin only.
    """
    permission_classes = [IsAdminUser]
    queryset = WorkflowStateStep.objects.all().select_related('state')

    @decorators.action(detail=True, methods=['post'])
    def add_role(self, request, pk=None):
        """Add a role to a step"""
        step = self.get_object()
        role_code = request.data.get('role_code')

        if not role_code:
            return Response(
                {'error': 'role_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            role = OrgRole.objects.get(code=role_code)
        except OrgRole.DoesNotExist:
            return Response(
                {'error': 'Role not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check if permission already exists
        perm, created = WorkflowStateStepPermission.objects.get_or_create(
            step=step,
            role=role,
            defaults={'is_active': True}
        )

        if not created and not perm.is_active:
            perm.is_active = True
            perm.save()

        return Response({
            'id': str(perm.id),
            'created': created,
            'role': {
                'id': str(role.id),
                'code': role.code,
                'name_fa': role.name_fa
            }
        })

    @decorators.action(detail=True, methods=['post'])
    def remove_role(self, request, pk=None):
        """Remove a role from a step"""
        step = self.get_object()
        role_code = request.data.get('role_code')

        if not role_code:
            return Response(
                {'error': 'role_code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            role = OrgRole.objects.get(code=role_code)
            perm = WorkflowStateStepPermission.objects.get(
                step=step,
                role=role
            )
            perm.is_active = False
            perm.save()

            return Response({'success': True})
        except (OrgRole.DoesNotExist, WorkflowStateStepPermission.DoesNotExist):
            return Response(
                {'error': 'Permission not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class StepPermissionOverrideViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing temporary permission overrides.
    Allows admin to temporarily change step approvers.
    """
    permission_classes = [IsAdminUser]
    queryset = StepPermissionOverride.objects.all().select_related(
        'workflow', 'user', 'step', 'step__state', 'granted_by'
    )

    def list(self, request):
        """List all active permission overrides"""
        overrides = self.get_queryset().filter(is_active=True).order_by('-created_at')

        data = []
        for override in overrides:
            data.append({
                'id': str(override.id),
                'workflow_id': str(override.workflow.pk),
                'workflow_state': override.workflow.state,
                'user': {
                    'id': str(override.user.id),
                    'username': override.user.username,
                },
                'step': {
                    'id': str(override.step.id),
                    'state_code': override.step.state.code,
                    'state_name_fa': override.step.state.name_fa,
                    'step_number': override.step.step_number,
                    'name_fa': override.step.name_fa,
                } if override.step else None,
                'expires_at': override.expires_at,
                'is_valid': override.is_valid(),
                'granted_by': {
                    'id': str(override.granted_by.id),
                    'username': override.granted_by.username,
                },
                'reason': override.reason,
                'created_at': override.created_at,
            })

        return Response(data)

    @decorators.action(detail=False, methods=['post'])
    def create_override(self, request):
        """
        Create a temporary permission override for a workflow.
        Allows admin to temporarily assign a different approver for a step.
        """
        workflow_id = request.data.get('workflow_id')
        user_id = request.data.get('user_id')
        step_id = request.data.get('step_id')
        duration_hours = request.data.get('duration_hours', 24)  # Default 24 hours
        reason = request.data.get('reason', '')

        # Validate required fields
        if not all([workflow_id, user_id]):
            return Response(
                {'error': 'workflow_id and user_id are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            from apps.workflows.models import Workflow
            workflow = Workflow.objects.get(pk=workflow_id)
            user = User.objects.get(pk=user_id)

            step = None
            if step_id:
                step = WorkflowStateStep.objects.get(pk=step_id)

            # Calculate expiration
            expires_at = timezone.now() + timedelta(hours=duration_hours)

            # Create override
            with transaction.atomic():
                override = StepPermissionOverride.objects.create(
                    workflow=workflow,
                    user=user,
                    step=step,
                    expires_at=expires_at,
                    granted_by=request.user,
                    reason=reason,
                    is_active=True
                )

            return Response({
                'id': str(override.id),
                'workflow_id': str(workflow.pk),
                'user': {
                    'id': str(user.id),
                    'username': user.username,
                },
                'step': {
                    'id': str(step.id),
                    'state_code': step.state.code,
                    'step_number': step.step_number,
                    'name_fa': step.name_fa,
                } if step else None,
                'expires_at': expires_at,
                'reason': reason,
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @decorators.action(detail=True, methods=['post'])
    def revoke(self, request, pk=None):
        """Revoke (deactivate) a permission override"""
        override = self.get_object()
        override.is_active = False
        override.save()

        return Response({'success': True})

    @decorators.action(detail=False, methods=['get'])
    def for_workflow(self, request):
        """Get all overrides for a specific workflow"""
        workflow_id = request.query_params.get('workflow_id')

        if not workflow_id:
            return Response(
                {'error': 'workflow_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        overrides = self.get_queryset().filter(
            workflow__pk=workflow_id,
            is_active=True
        )

        data = []
        for override in overrides:
            data.append({
                'id': str(override.id),
                'user': {
                    'id': str(override.user.id),
                    'username': override.user.username,
                },
                'step': {
                    'id': str(override.step.id),
                    'step_number': override.step.step_number,
                    'name_fa': override.step.name_fa,
                } if override.step else None,
                'expires_at': override.expires_at,
                'is_valid': override.is_valid(),
                'reason': override.reason,
            })

        return Response(data)


class AvailableRolesViewSet(viewsets.ViewSet):
    """
    ViewSet for getting available roles for permission assignment.
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all available roles"""
        # Don't order by group__name as it causes issues with MongoDB
        roles = OrgRole.objects.all().order_by('code')

        data = []
        for role in roles:
            group_name = None
            if hasattr(role, 'group') and role.group:
                # OrgRoleGroup has name_fa, not name
                group_name = getattr(role.group, 'name_fa', None) or getattr(role.group, 'code', None)

            data.append({
                'id': str(role.id),
                'code': role.code,
                'name_en': getattr(role, 'name_en', role.code),
                'name_fa': role.name_fa,
                'group': group_name,
            })

        return Response(data)
