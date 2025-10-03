# apps/admin_panel/apps.py
from django.apps import AppConfig


class AdminPanelConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'apps.admin_panel'
    verbose_name = 'Admin Panel'
