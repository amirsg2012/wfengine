from django.apps import AppConfig


class IntegrationsConfig(AppConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"
    name = 'apps.integrations'
