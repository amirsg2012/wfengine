# backend/apps/admin/apps.py
from django.apps import AppConfig

class AdminConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'apps.admin'
    label = 'wf_admin'
    verbose_name = 'Admin Management'
    
    def ready(self):
        # Import signal handlers
        from . import signals

