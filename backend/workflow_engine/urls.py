# backend/workflow_engine/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from apps.letters.api import LetterViewSet
from apps.accounts.api import AuthView, MeView

router = DefaultRouter()
router.register(r"letters", LetterViewSet, basename="letters")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", AuthView.as_view(), name="auth"),
    path("api/me/", MeView.as_view(), name="me"),
    path("api/admin/", include("apps.admin.urls")),  # Add admin routes
    path("api/", include(router.urls)),
]