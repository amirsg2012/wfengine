# backend/apps/admin/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import (
    AdminStatsView,
    AdminUsersView,
    AdminRolesView,
    SystemLogsViewSet,
    RecentActivityView
)

router = DefaultRouter()
router.register(r'system-logs', SystemLogsViewSet, basename='admin-logs')

urlpatterns = [
    path('stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('users/', AdminUsersView.as_view(), name='admin-users'),
    path('roles/', AdminRolesView.as_view(), name='admin-roles'),
    path('recent-activity/', RecentActivityView.as_view(), name='admin-recent-activity'),
    path('', include(router.urls)),
]