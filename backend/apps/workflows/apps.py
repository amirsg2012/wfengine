from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"
    name = 'apps.workflows'
