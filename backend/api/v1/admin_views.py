# backend/api/v1/admin_views.py
"""
Admin-only API views
"""
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db.models import Q, Count
from rest_framework import viewsets, permissions, decorators, status
from rest_framework.response import Response
from datetime import timedelta

from apps.admin_panel.models import SystemSettings, UserSession, AuditLog
from apps.workflows.models import Workflow, Action
from apps.accounts.models import OrgRole, Membership
from apps.permissions.models import (
    StatePermission, StateStepPermission,
    FormPermission, FormFieldPermission,
    PermissionType
)

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    """
    Permission class for admin-only access
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_superuser


class AdminDashboardViewSet(viewsets.ViewSet):
    """
    Admin dashboard statistics and data
    """
    permission_classes = [IsAdminUser]

    @decorators.action(detail=False, methods=['get'])
    def stats(self, request):
        """Get dashboard statistics"""
        # Users stats
        total_users = User.objects.count()
        active_users_count = UserSession.get_online_users(minutes=30).values('user').distinct().count()

        # Workflows stats
        total_workflows = Workflow.objects.count()
        active_workflows = Workflow.objects.exclude(state='Settlment').count()
        pending_approvals = sum(1 for wf in Workflow.objects.exclude(state='Settlment')
                               if wf.state in ['ApplicantRequest', 'CEOInstruction', 'Form1', 'Form2'])

        # Recent activity count
        last_24h = timezone.now() - timedelta(hours=24)
        recent_actions = Action.objects.filter(created_at__gte=last_24h).count()

        return Response({
            'users': {
                'total': total_users,
                'online': active_users_count,
            },
            'workflows': {
                'total': total_workflows,
                'active': active_workflows,
                'pending_approvals': pending_approvals,
            },
            'activity': {
                'actions_24h': recent_actions,
            }
        })

    @decorators.action(detail=False, methods=['get'])
    def online_users(self, request):
        """Get currently online users"""
        minutes = int(request.query_params.get('minutes', 15))
        sessions = UserSession.get_online_users(minutes=minutes)

        online_users = []
        for session in sessions:
            online_users.append({
                'id': str(session.user.id),
                'username': session.user.username,
                'first_name': session.user.first_name,
                'last_name': session.user.last_name,
                'email': session.user.email,
                'ip_address': session.ip_address,
                'last_activity': session.last_activity,
                'session_duration': (timezone.now() - session.created_at).total_seconds() / 60,  # minutes
            })

        return Response({
            'count': len(online_users),
            'users': online_users,
            'checked_minutes': minutes,
        })

    @decorators.action(detail=False, methods=['get'])
    def recent_activity(self, request):
        """Get recent system activity"""
        limit = int(request.query_params.get('limit', 20))
        hours = int(request.query_params.get('hours', 24))

        since = timezone.now() - timedelta(hours=hours)

        # Get recent actions
        actions = Action.objects.filter(
            created_at__gte=since
        ).select_related('workflow', 'performer').order_by('-created_at')[:limit]

        activities = []
        for action in actions:
            activities.append({
                'id': str(action.id),
                'action': action.action_type,
                'workflow_id': str(action.workflow.id),
                'workflow_title': action.workflow.title,
                'state': action.state,
                'performer': action.performer.username if action.performer else 'System',
                'timestamp': action.created_at,
            })

        # Get recent audit logs
        audit_logs = AuditLog.objects.filter(
            timestamp__gte=since
        ).order_by('-timestamp')[:limit]

        for log in audit_logs:
            activities.append({
                'id': str(log.id),
                'action': f"Admin: {log.action}",
                'model': log.model_name,
                'object_id': log.object_id,
                'user': log.user.username if log.user else 'System',
                'timestamp': log.timestamp,
            })

        # Sort all activities by timestamp
        activities.sort(key=lambda x: x['timestamp'], reverse=True)

        return Response({
            'activities': activities[:limit],
            'period_hours': hours,
        })


class SystemSettingsViewSet(viewsets.ViewSet):
    """
    System settings management
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all settings"""
        category = request.query_params.get('category')

        settings = SystemSettings.objects.all()
        if category:
            settings = settings.filter(category=category)

        data = []
        for setting in settings:
            data.append({
                'key': setting.key,
                'value': setting.value,
                'typed_value': setting.get_typed_value(),
                'value_type': setting.value_type,
                'description': setting.description,
                'category': setting.category,
                'is_public': setting.is_public,
                'updated_at': setting.updated_at,
                'updated_by': setting.updated_by.username if setting.updated_by else None,
            })

        # Group by category
        categories = {}
        for item in data:
            cat = item['category']
            if cat not in categories:
                categories[cat] = []
            categories[cat].append(item)

        return Response({
            'settings': data,
            'by_category': categories,
        })

    def retrieve(self, request, pk=None):
        """Get specific setting"""
        try:
            setting = SystemSettings.objects.get(key=pk)
            return Response({
                'key': setting.key,
                'value': setting.value,
                'typed_value': setting.get_typed_value(),
                'value_type': setting.value_type,
                'description': setting.description,
                'category': setting.category,
                'is_public': setting.is_public,
                'updated_at': setting.updated_at,
            })
        except SystemSettings.DoesNotExist:
            return Response({'error': 'Setting not found'}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        """Create new setting"""
        setting = SystemSettings.set_value(
            key=request.data.get('key'),
            value=request.data.get('value'),
            value_type=request.data.get('value_type', 'string'),
            description=request.data.get('description', ''),
            category=request.data.get('category', 'general'),
            user=request.user
        )

        # Log the action
        AuditLog.objects.create(
            user=request.user,
            action='CREATE_SETTING',
            model_name='SystemSettings',
            object_id=setting.key,
            changes=f"Created setting {setting.key}",
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        return Response({
            'key': setting.key,
            'value': setting.value,
            'message': 'Setting created successfully'
        }, status=status.HTTP_201_CREATED)

    def update(self, request, pk=None):
        """Update existing setting"""
        try:
            setting = SystemSettings.objects.get(key=pk)
            old_value = setting.value

            setting.value = request.data.get('value', setting.value)
            setting.value_type = request.data.get('value_type', setting.value_type)
            setting.description = request.data.get('description', setting.description)
            setting.category = request.data.get('category', setting.category)
            setting.is_public = request.data.get('is_public', setting.is_public)
            setting.updated_by = request.user
            setting.save()

            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE_SETTING',
                model_name='SystemSettings',
                object_id=setting.key,
                changes=f"Changed {setting.key} from {old_value} to {setting.value}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            return Response({
                'key': setting.key,
                'value': setting.value,
                'message': 'Setting updated successfully'
            })
        except SystemSettings.DoesNotExist:
            return Response({'error': 'Setting not found'}, status=status.HTTP_404_NOT_FOUND)

    @decorators.action(detail=False, methods=['get'])
    def categories(self, request):
        """Get all setting categories"""
        categories = SystemSettings.objects.values_list('category', flat=True).distinct()
        return Response({'categories': list(categories)})

    @decorators.action(detail=False, methods=['post'])
    def initialize_defaults(self, request):
        """Initialize default system settings"""
        defaults = [
            {
                'key': 'JWT_ACCESS_TOKEN_LIFETIME',
                'value': '15',
                'value_type': 'integer',
                'description': 'JWT Access Token lifetime in minutes',
                'category': 'auth',
            },
            {
                'key': 'JWT_REFRESH_TOKEN_LIFETIME',
                'value': '1440',
                'value_type': 'integer',
                'description': 'JWT Refresh Token lifetime in minutes (24 hours)',
                'category': 'auth',
            },
            {
                'key': 'SESSION_TIMEOUT',
                'value': '30',
                'value_type': 'integer',
                'description': 'User session timeout in minutes',
                'category': 'auth',
            },
            {
                'key': 'MAX_UPLOAD_SIZE',
                'value': '10485760',
                'value_type': 'integer',
                'description': 'Maximum file upload size in bytes (10MB)',
                'category': 'storage',
            },
            {
                'key': 'ENABLE_NOTIFICATIONS',
                'value': 'true',
                'value_type': 'boolean',
                'description': 'Enable system notifications',
                'category': 'general',
            },
        ]

        created_count = 0
        for default in defaults:
            _, created = SystemSettings.objects.get_or_create(
                key=default['key'],
                defaults={
                    'value': default['value'],
                    'value_type': default['value_type'],
                    'description': default['description'],
                    'category': default['category'],
                    'updated_by': request.user,
                }
            )
            if created:
                created_count += 1

        return Response({
            'message': f'Initialized {created_count} default settings',
            'total_defaults': len(defaults),
        })


class PermissionManagementViewSet(viewsets.ViewSet):
    """
    Permission management for admin
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all permissions"""
        permission_type = request.query_params.get('type', 'all')  # state, form, step, field, all

        result = {}

        if permission_type in ['all', 'state']:
            state_perms = StatePermission.objects.select_related('role', 'user').all()
            result['state_permissions'] = [
                {
                    'id': str(p.id),
                    'state': p.state,
                    'permission_type': p.permission_type,
                    'role': p.role.code if p.role else None,
                    'user': p.user.username if p.user else None,
                    'is_active': p.is_active,
                    'restrict_to_own': p.restrict_to_own,
                }
                for p in state_perms
            ]

        if permission_type in ['all', 'step']:
            step_perms = StateStepPermission.objects.select_related('role', 'user').all()
            result['step_permissions'] = [
                {
                    'id': str(p.id),
                    'state': p.state,
                    'step': p.step,
                    'role': p.role.code if p.role else None,
                    'user': p.user.username if p.user else None,
                    'is_active': p.is_active,
                }
                for p in step_perms
            ]

        if permission_type in ['all', 'form']:
            form_perms = FormPermission.objects.select_related('role', 'user').all()
            result['form_permissions'] = [
                {
                    'id': str(p.id),
                    'form_number': p.form_number,
                    'permission_type': p.permission_type,
                    'role': p.role.code if p.role else None,
                    'user': p.user.username if p.user else None,
                    'is_active': p.is_active,
                }
                for p in form_perms
            ]

        return Response(result)

    @decorators.action(detail=False, methods=['get'])
    def summary(self, request):
        """Get permission system summary"""
        return Response({
            'state_permissions': StatePermission.objects.count(),
            'state_step_permissions': StateStepPermission.objects.count(),
            'form_permissions': FormPermission.objects.count(),
            'form_field_permissions': FormFieldPermission.objects.count(),
            'total_roles': OrgRole.objects.count(),
            'total_users': User.objects.count(),
        })

    @decorators.action(detail=True, methods=['patch'])
    def toggle(self, request, pk=None):
        """Toggle permission active status"""
        perm_type = request.data.get('type')  # 'state', 'form', 'step', 'field'

        try:
            if perm_type == 'state':
                perm = StatePermission.objects.get(id=pk)
            elif perm_type == 'form':
                perm = FormPermission.objects.get(id=pk)
            elif perm_type == 'step':
                perm = StateStepPermission.objects.get(id=pk)
            elif perm_type == 'field':
                perm = FormFieldPermission.objects.get(id=pk)
            else:
                return Response({'error': 'Invalid permission type'}, status=status.HTTP_400_BAD_REQUEST)

            perm.is_active = not perm.is_active
            perm.save()

            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='TOGGLE_PERMISSION',
                model_name=perm.__class__.__name__,
                object_id=str(pk),
                changes=f"Toggled permission to {'active' if perm.is_active else 'inactive'}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            return Response({
                'id': str(perm.id),
                'is_active': perm.is_active,
                'message': 'Permission toggled successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)

    @decorators.action(detail=True, methods=['put'])
    def update_permission(self, request, pk=None):
        """Update permission details"""
        perm_type = request.data.get('type')  # 'state', 'form', 'step', 'field'

        try:
            if perm_type == 'state':
                perm = StatePermission.objects.get(id=pk)
                if 'permission_type' in request.data:
                    perm.permission_type = request.data['permission_type']
                if 'restrict_to_own' in request.data:
                    perm.restrict_to_own = request.data['restrict_to_own']
            elif perm_type == 'form':
                perm = FormPermission.objects.get(id=pk)
                if 'permission_type' in request.data:
                    perm.permission_type = request.data['permission_type']
            elif perm_type == 'step':
                perm = StateStepPermission.objects.get(id=pk)
            elif perm_type == 'field':
                perm = FormFieldPermission.objects.get(id=pk)
                if 'permission_type' in request.data:
                    perm.permission_type = request.data['permission_type']
            else:
                return Response({'error': 'Invalid permission type'}, status=status.HTTP_400_BAD_REQUEST)

            perm.is_active = request.data.get('is_active', perm.is_active)
            perm.save()

            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE_PERMISSION',
                model_name=perm.__class__.__name__,
                object_id=str(pk),
                changes=f"Updated permission",
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            return Response({
                'id': str(perm.id),
                'is_active': perm.is_active,
                'message': 'Permission updated successfully'
            })
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_404_NOT_FOUND)


class UserManagementViewSet(viewsets.ViewSet):
    """
    User management for admin
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all users with their roles"""
        users = User.objects.all()

        result = []
        for user in users:
            # Get user's roles
            memberships = Membership.objects.filter(user=user).select_related('role', 'role__group')
            roles = [
                {
                    'code': m.role.code,
                    'name_fa': m.role.name_fa,
                    'group': {
                        'code': m.role.group.code,
                        'name_fa': m.role.group.name_fa
                    }
                }
                for m in memberships
            ]
            role_codes = [m.role.code for m in memberships]

            result.append({
                'id': str(user.id),
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_active': user.is_active,
                'is_superuser': user.is_superuser,
                'roles': roles,
                'role_codes': role_codes,
            })

        return Response({'results': result})

    def retrieve(self, request, pk=None):
        """Get single user details"""
        try:
            user = User.objects.get(id=pk)
            memberships = Membership.objects.filter(user=user).select_related('role', 'role__group')
            roles = [
                {
                    'code': m.role.code,
                    'name_fa': m.role.name_fa,
                    'group': {
                        'code': m.role.group.code,
                        'name_fa': m.role.group.name_fa
                    }
                }
                for m in memberships
            ]
            role_codes = [m.role.code for m in memberships]

            return Response({
                'id': str(user.id),
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_active': user.is_active,
                'is_superuser': user.is_superuser,
                'roles': roles,
                'role_codes': role_codes,
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request):
        """Create new user"""
        try:
            username = request.data.get('username')
            password = request.data.get('password')

            if not username or not password:
                return Response({'error': 'Username and password are required'}, status=status.HTTP_400_BAD_REQUEST)

            # Check if username exists
            if User.objects.filter(username=username).exists():
                return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

            # Create user
            user = User.objects.create_user(
                username=username,
                password=password,
                first_name=request.data.get('first_name', ''),
                last_name=request.data.get('last_name', ''),
                email=request.data.get('email', ''),
                is_active=request.data.get('is_active', True),
                is_superuser=request.data.get('is_superuser', False),
            )

            # Add roles
            selected_roles = request.data.get('selected_roles', [])
            for role_code in selected_roles:
                try:
                    role = OrgRole.objects.get(code=role_code)
                    Membership.objects.create(user=user, role=role)
                except OrgRole.DoesNotExist:
                    pass

            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='CREATE_USER',
                model_name='User',
                object_id=str(user.id),
                changes=f"Created user {user.username}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            return Response({
                'id': str(user.id),
                'username': user.username,
                'message': 'User created successfully'
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        """Update existing user"""
        try:
            user = User.objects.get(id=pk)

            # Update basic fields
            user.username = request.data.get('username', user.username)
            user.first_name = request.data.get('first_name', user.first_name)
            user.last_name = request.data.get('last_name', user.last_name)
            user.email = request.data.get('email', user.email)
            user.is_active = request.data.get('is_active', user.is_active)
            user.is_superuser = request.data.get('is_superuser', user.is_superuser)

            # Update password if provided
            password = request.data.get('password')
            if password:
                user.set_password(password)

            user.save()

            # Update roles
            if 'selected_roles' in request.data:
                # Remove all existing memberships
                Membership.objects.filter(user=user).delete()

                # Add new roles
                selected_roles = request.data.get('selected_roles', [])
                for role_code in selected_roles:
                    try:
                        role = OrgRole.objects.get(code=role_code)
                        Membership.objects.create(user=user, role=role)
                    except OrgRole.DoesNotExist:
                        pass

            # Log the action
            AuditLog.objects.create(
                user=request.user,
                action='UPDATE_USER',
                model_name='User',
                object_id=str(user.id),
                changes=f"Updated user {user.username}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            return Response({
                'id': str(user.id),
                'username': user.username,
                'message': 'User updated successfully'
            })
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, pk=None):
        """Partial update (PATCH)"""
        return self.update(request, pk)

    def destroy(self, request, pk=None):
        """Delete user"""
        try:
            user = User.objects.get(id=pk)
            username = user.username

            # Log before deletion
            AuditLog.objects.create(
                user=request.user,
                action='DELETE_USER',
                model_name='User',
                object_id=str(user.id),
                changes=f"Deleted user {username}",
                ip_address=request.META.get('REMOTE_ADDR'),
            )

            user.delete()

            return Response({
                'message': f'User {username} deleted successfully'
            }, status=status.HTTP_204_NO_CONTENT)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)


class RoleManagementViewSet(viewsets.ViewSet):
    """
    Role management for admin
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all roles"""
        roles = OrgRole.objects.select_related('group').all()

        result = []
        for role in roles:
            result.append({
                'id': str(role.id),
                'code': role.code,
                'name_fa': role.name_fa,
                'group': {
                    'code': role.group.code,
                    'name_fa': role.group.name_fa
                }
            })

        return Response({'results': result})


class AuditLogViewSet(viewsets.ViewSet):
    """
    Audit log management for admin
    """
    permission_classes = [IsAdminUser]

    def list(self, request):
        """List all audit logs with pagination"""
        # Get query parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        search = request.query_params.get('search', '')
        action = request.query_params.get('action', '')
        user_filter = request.query_params.get('user', '')

        # Base queryset
        queryset = AuditLog.objects.select_related('user').all().order_by('-timestamp')

        # Apply filters
        if search:
            queryset = queryset.filter(
                Q(action__icontains=search) |
                Q(model_name__icontains=search) |
                Q(changes__icontains=search)
            )

        if action:
            queryset = queryset.filter(action__icontains=action)

        if user_filter:
            queryset = queryset.filter(user__username__icontains=user_filter)

        # Pagination
        total_count = queryset.count()
        start_index = (page - 1) * page_size
        end_index = start_index + page_size
        paginated_logs = queryset[start_index:end_index]

        # Serialize
        result = []
        for log in paginated_logs:
            result.append({
                'id': str(log.id),
                'action': log.action,
                'model_name': log.model_name,
                'object_id': log.object_id,
                'changes': log.changes,
                'user': log.user.username if log.user else 'سیستم',
                'user_id': str(log.user.id) if log.user else None,
                'ip_address': log.ip_address,
                'timestamp': log.timestamp,
            })

        return Response({
            'results': result,
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size
        })
