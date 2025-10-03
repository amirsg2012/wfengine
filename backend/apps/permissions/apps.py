# apps/permissions/apps.py
from django.apps import AppConfig


class PermissionsConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'apps.permissions'
    verbose_name = 'Permission Management'
