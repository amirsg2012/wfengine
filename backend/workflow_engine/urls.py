# backend/workflow_engine/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # API v1 - Centralized API endpoints
    path("api/v1/", include("api.v1.urls")),
    # For backward compatibility, also include at /api/
    path("api/", include("api.v1.urls")),
]