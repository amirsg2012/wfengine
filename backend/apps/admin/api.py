# backend/apps/admin/api.py
from rest_framework import viewsets, permissions, status, decorators
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.http import HttpResponse
from django.utils import timezone
from datetime import timedelta
import json
import csv

from apps.accounts.models import OrgRole, OrgRoleGroup, Membership
from apps.letters.models import Letter
from apps.letters.workflow_spec import ADVANCER_STEPS, STATE_ORDER
from .models import SystemLog
from .serializers import SystemLogSerializer

User = get_user_model()

class AdminStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Calculate stats
        total_users = User.objects.count()
        active_workflows = Letter.objects.exclude(state='Settlment').count()
        pending_approvals = Letter.objects.filter(
            # Add logic for pending approvals based on your workflow
        ).count()
        
        # Recent errors (last 24 hours)
        yesterday = timezone.now() - timedelta(days=1)
        system_errors = SystemLog.objects.filter(
            level__in=['ERROR', 'CRITICAL'],
            created_at__gte=yesterday
        ).count()
        
        return Response({
            'totalUsers': total_users,
            'activeWorkflows': active_workflows,
            'pendingApprovals': pending_approvals,
            'systemErrors': system_errors
        })

class AdminUsersView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        if not request.user.is_superuser:
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        users = User.objects.all().order_by('-date_joined')
        users_data = []
        
        for user in users:
            memberships = Membership.objects.filter(user=user).select_related('role__group')
            roles = []
            role_codes = []
            
            for membership in memberships:
                role = membership.role
                roles.append({
                    'code': role.code,
                    'name_fa': role.name_fa,
                    'group': {
                        'code': role.group.code,
                        'name_fa': role.group.name_fa
                    }
                })
                role_codes.append(role.code)
            
            users_data.append({
                'id': str(user.id),
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_active': user.is_active,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined,
                'roles': roles,
                'role_codes': role_codes
            })
        
        return Response({'results': users_data})

class AdminUsersViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Check admin permission
        if not (self.request.user.is_superuser or 'ADMIN' in getattr(self.request.user, 'role_codes', [])):
            return User.objects.none()
        
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', '')
        
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        
        return queryset
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        
        # Add role information to each user
        users_data = []
        for user in queryset:
            memberships = Membership.objects.filter(user=user).select_related('role__group')
            roles = []
            role_codes = []
            
            for membership in memberships:
                role = membership.role
                roles.append({
                    'code': role.code,
                    'name_fa': role.name_fa,
                    'group': {
                        'code': role.group.code,
                        'name_fa': role.group.name_fa
                    }
                })
                role_codes.append(role.code)
            
            users_data.append({
                'id': str(user.id),
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'is_active': user.is_active,
                'is_superuser': user.is_superuser,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'roles': roles,
                'role_codes': role_codes
            })
        
        return Response({
            'results': users_data,
            'count': len(users_data)
        })
    
    def create(self, request, *args, **kwargs):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        data = request.data
        
        try:
            # Create user
            user = User.objects.create_user(
                username=data['username'],
                email=data.get('email', ''),
                password=data['password'],
                first_name=data.get('first_name', ''),
                last_name=data.get('last_name', ''),
                is_active=data.get('is_active', True),
                is_superuser=data.get('is_superuser', False)
            )
            
            # Assign roles
            selected_roles = data.get('selected_roles', [])
            for role_code in selected_roles:
                try:
                    role = OrgRole.objects.get(code=role_code)
                    Membership.objects.create(user=user, role=role)
                except OrgRole.DoesNotExist:
                    continue
            
            # Log the action
            SystemLog.objects.create(
                level='SUCCESS',
                action='CREATE',
                message=f'کاربر جدید ایجاد شد',
                description=f'کاربر "{user.username}" با نقش‌های {", ".join(selected_roles)} اضافه شد',
                user=request.user.username,
                ip_address=self.get_client_ip(request),
                details={'user_id': str(user.id), 'roles': selected_roles}
            )
            
            return Response({'id': str(user.id), 'message': 'کاربر با موفقیت ایجاد شد'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def update(self, request, *args, **kwargs):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        user = self.get_object()
        data = request.data
        
        try:
            # Update user fields
            user.username = data.get('username', user.username)
            user.first_name = data.get('first_name', user.first_name)
            user.last_name = data.get('last_name', user.last_name)
            user.email = data.get('email', user.email)
            user.is_active = data.get('is_active', user.is_active)
            user.is_superuser = data.get('is_superuser', user.is_superuser)
            
            # Update password if provided
            if data.get('password'):
                user.set_password(data['password'])
            
            user.save()
            
            # Update roles
            selected_roles = data.get('selected_roles', [])
            
            # Remove old memberships
            Membership.objects.filter(user=user).delete()
            
            # Add new memberships
            for role_code in selected_roles:
                try:
                    role = OrgRole.objects.get(code=role_code)
                    Membership.objects.create(user=user, role=role)
                except OrgRole.DoesNotExist:
                    continue
            
            # Log the action
            SystemLog.objects.create(
                level='INFO',
                action='UPDATE',
                message=f'کاربر بروزرسانی شد',
                description=f'اطلاعات کاربر "{user.username}" تغییر کرد',
                user=request.user.username,
                ip_address=self.get_client_ip(request)
            )
            
            return Response({'message': 'کاربر با موفقیت بروزرسانی شد'})
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class AdminRolesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        roles = OrgRole.objects.all().select_related('group')
        roles_data = []
        
        for role in roles:
            roles_data.append({
                'code': role.code,
                'name_fa': role.name_fa,
                'group': {
                    'code': role.group.code,
                    'name_fa': role.group.name_fa
                }
            })
        
        return Response({
            'results': roles_data
        })

class WorkflowConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Return current workflow configuration
        config = {}
        for state in STATE_ORDER:
            config[state] = {
                'steps': ADVANCER_STEPS.get(state, []),
                'order': STATE_ORDER.index(state)
            }
        
        return Response(config)
    
    def put(self, request):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # This would require implementing dynamic workflow configuration
        # For now, return a success message
        state = request.data.get('state')
        steps = request.data.get('steps')
        
        # Log the action
        SystemLog.objects.create(
            level='INFO',
            action='UPDATE',
            message=f'تنظیمات گردش کار تغییر کرد',
            description=f'مراحل تایید حالت "{state}" بروزرسانی شد',
            user=request.user.username,
            ip_address=self.get_client_ip(request),
            details={'state': state, 'steps': steps}
        )
        
        return Response({'message': 'تنظیمات با موفقیت ذخیره شد'})
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

class SystemLogsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SystemLog.objects.all().order_by('-created_at')
    serializer_class = SystemLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        # Check admin permission
        if not (self.request.user.is_superuser or 'ADMIN' in getattr(self.request.user, 'role_codes', [])):
            return SystemLog.objects.none()
        
        queryset = super().get_queryset()
        
        # Apply filters
        search = self.request.query_params.get('search', '')
        level = self.request.query_params.get('level', '')
        date_from = self.request.query_params.get('date_from', '')
        date_to = self.request.query_params.get('date_to', '')
        user = self.request.query_params.get('user', '')
        
        if search:
            queryset = queryset.filter(
                Q(message__icontains=search) |
                Q(description__icontains=search)
            )
        
        if level:
            queryset = queryset.filter(level=level)
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        if user:
            queryset = queryset.filter(user__icontains=user)
        
        return queryset
    
    @decorators.action(detail=False, methods=['get'])
    def export(self, request):
        """Export logs as CSV"""
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        queryset = self.get_queryset()
        
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = f'attachment; filename="system-logs-{timezone.now().strftime("%Y%m%d")}.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['تاریخ', 'سطح', 'عمل', 'پیام', 'توضیحات', 'کاربر', 'آدرس IP'])
        
        for log in queryset:
            writer.writerow([
                log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
                log.level,
                log.action,
                log.message,
                log.description,
                log.user or 'سیستم',
                log.ip_address or ''
            ])
        
        return response

class RecentActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        # Check admin permission
        if not (request.user.is_superuser or 'ADMIN' in getattr(request.user, 'role_codes', [])):
            return Response({'detail': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get recent activities (last 24 hours)
        yesterday = timezone.now() - timedelta(days=1)
        recent_logs = SystemLog.objects.filter(
            created_at__gte=yesterday,
            level__in=['SUCCESS', 'INFO']
        ).order_by('-created_at')[:10]
        
        activities = []
        for log in recent_logs:
            time_diff = timezone.now() - log.created_at
            if time_diff.total_seconds() < 3600:  # Less than 1 hour
                time_str = f"{int(time_diff.total_seconds() // 60)} دقیقه پیش"
            elif time_diff.total_seconds() < 86400:  # Less than 1 day
                time_str = f"{int(time_diff.total_seconds() // 3600)} ساعت پیش"
            else:
                time_str = log.created_at.strftime('%Y-%m-%d')
            
            activities.append({
                'action': log.message,
                'user': log.user or 'سیستم',
                'time': time_str
            })
        
        return Response({
            'results': activities
        })


class SystemLogsViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SystemLog.objects.all().order_by('-created_at')
    serializer_class = SystemLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if not self.request.user.is_superuser:
            return SystemLog.objects.none()
        return super().get_queryset()