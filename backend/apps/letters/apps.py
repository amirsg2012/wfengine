from django.apps import AppConfig


class LettersConfig(AppConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"
    name = 'apps.letters'
