from django.apps import AppConfig


class WorkflowsConfig(AppConfig):
    default_auto_field = "django_mongodb_backend.fields.ObjectIdAutoField"
    name = 'apps.workflows'

    def ready(self):
        """Import forms to register them"""
        try:
            # Import forms to trigger registration
            from .forms import form_1, form_2
            from .forms.registry import FormRegistry
            
            # Optional: print registered forms for debugging
            forms = FormRegistry.get_all_forms()
            print(f"\u2705 Registered {len(forms)} forms: {list(forms.keys())}")
            
        except ImportError as e:
            print(f"\u274c Failed to import forms: {e}")
