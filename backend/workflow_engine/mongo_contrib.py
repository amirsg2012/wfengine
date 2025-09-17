from django.contrib.admin.apps import AdminConfig
from django.contrib.auth.apps import AuthConfig
from django.contrib.contenttypes.apps import ContentTypesConfig

OID = "django_mongodb_backend.fields.ObjectIdAutoField"

class MongoAdminConfig(AdminConfig):
    default_auto_field = OID
    name = "django.contrib.admin"

class MongoAuthConfig(AuthConfig):
    default_auto_field = OID
    name = "django.contrib.auth"

class MongoContentTypesConfig(ContentTypesConfig):
    default_auto_field = OID
    name = "django.contrib.contenttypes"
