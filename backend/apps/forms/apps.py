# apps/forms/apps.py
from django.apps import AppConfig


class FormsConfig(AppConfig):
    default_auto_field = 'django_mongodb_backend.fields.ObjectIdAutoField'
    name = 'apps.forms'
    verbose_name = 'Dynamic Forms'
