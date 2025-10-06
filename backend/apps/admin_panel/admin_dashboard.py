# apps/admin_panel/admin_dashboard.py
from django.contrib import admin
from django.template.response import TemplateResponse
from django.urls import path
from django.utils.html import format_html
from .models import UserSession, AuditLog
from apps.workflows.models import Workflow
from apps.accounts.models import OrgRole


class CustomAdminSite(admin.AdminSite):
    """Custom admin site with dashboard widgets"""

    site_header = "Workflow Engine Admin"
    site_title = "Workflow Admin"
    index_title = "Dashboard"

    def index(self, request, extra_context=None):
        """
        Display custom dashboard with widgets
        """
        # Get online users (active in last 15 minutes)
        online_users = UserSession.get_online_users(minutes=15)

        # Get recent audit logs
        recent_logs = AuditLog.objects.select_related('user')[:10]

        # Get workflow statistics
        total_workflows = Workflow.objects.count()
        workflows_by_state = {}
        for state_choice in Workflow.State.choices:
            state_code = state_choice[0]
            count = Workflow.objects.filter(state=state_code).count()
            if count > 0:
                workflows_by_state[state_choice[1]] = count

        # Get user statistics
        from django.contrib.auth import get_user_model
        User = get_user_model()
        total_users = User.objects.count()
        total_roles = OrgRole.objects.count()

        extra_context = extra_context or {}
        extra_context.update({
            'online_users': online_users,
            'online_users_count': online_users.count(),
            'recent_logs': recent_logs,
            'total_workflows': total_workflows,
            'workflows_by_state': workflows_by_state,
            'total_users': total_users,
            'total_roles': total_roles,
        })

        return super().index(request, extra_context=extra_context)

    def get_app_list(self, request):
        """
        Return the list of apps and models for the admin index page
        """
        app_list = super().get_app_list(request)

        # Reorder apps to show important ones first
        app_order = ['workflows', 'permissions', 'accounts', 'admin_panel', 'auth']

        def get_app_priority(app):
            try:
                return app_order.index(app['app_label'])
            except ValueError:
                return 999

        app_list.sort(key=get_app_priority)

        return app_list


# Create custom admin site instance
custom_admin_site = CustomAdminSite(name='custom_admin')
