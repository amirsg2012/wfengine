# backend/api/v1/urls.py
"""
Centralized URL configuration for API v1
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WorkflowViewSet,
    WorkflowFormViewSet,
    AttachmentViewSet,
    CommentViewSet,
    ActionViewSet,
    CurrentUserView,
    WorkflowTemplateViewSet,
    WorkflowStateViewSet
)
from .forms_views import (
    DynamicFormViewSet,
    FormFieldViewSet,
    WorkflowFormDataViewSet
)
from .signature_views import UserSignatureViewSet, WorkflowSignatureViewSet
from .admin_views import (
    AdminDashboardViewSet,
    SystemSettingsViewSet,
    PermissionManagementViewSet,
    UserManagementViewSet,
    RoleManagementViewSet,
    AuditLogViewSet
)
from apps.accounts.api import AuthView, MeView, ChangePasswordView

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'workflow-templates', WorkflowTemplateViewSet, basename='workflow-templates')
router.register(r'workflow-states', WorkflowStateViewSet, basename='workflow-states')
router.register(r'workflows', WorkflowViewSet, basename='workflows')
router.register(r'workflow-forms', WorkflowFormViewSet, basename='workflow-forms')
router.register(r'attachments', AttachmentViewSet, basename='attachments')
router.register(r'comments', CommentViewSet, basename='comments')
router.register(r'actions', ActionViewSet, basename='actions')
router.register(r'signatures', UserSignatureViewSet, basename='signatures')
router.register(r'workflow-signatures', WorkflowSignatureViewSet, basename='workflow-signatures')

# Dynamic forms viewsets
router.register(r'dynamic-forms', DynamicFormViewSet, basename='dynamic-forms')
router.register(r'form-fields', FormFieldViewSet, basename='form-fields')
router.register(r'workflow-form-data', WorkflowFormDataViewSet, basename='workflow-form-data')

# Admin viewsets
router.register(r'admin/dashboard', AdminDashboardViewSet, basename='admin-dashboard')
router.register(r'admin/settings', SystemSettingsViewSet, basename='admin-settings')
router.register(r'admin/permissions', PermissionManagementViewSet, basename='admin-permissions')
router.register(r'admin/users', UserManagementViewSet, basename='admin-users')
router.register(r'admin/roles', RoleManagementViewSet, basename='admin-roles')
router.register(r'admin/logs', AuditLogViewSet, basename='admin-logs')

# URL patterns
urlpatterns = [
    # Auth endpoints
    path('auth/', AuthView.as_view(), name='auth'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('me/', MeView.as_view(), name='me'),

    # Router URLs
    path('', include(router.urls)),
]
