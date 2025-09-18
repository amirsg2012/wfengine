# backend/workflow_engine/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.workflows.api.api import WorkflowViewSet
from apps.workflows.api.views import WorkflowFormViewSet
from apps.accounts.api import AuthView, MeView

router = DefaultRouter()
router.register(r"workflows", WorkflowViewSet, basename="workflows")
router.register(r'workflows/forms', WorkflowFormViewSet, basename='workflow-forms')

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", AuthView.as_view(), name="auth"),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/admin/", include("apps.admin.urls")),  # Add admin routes
    path("api/", include(router.urls)),
]