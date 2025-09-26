import os
import workflow_engine.drf_mongo
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev")
DEBUG = os.getenv("DEBUG", "1") in ("1","true","True")
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS","*").split(",")

DEFAULT_AUTO_FIELD = "django_mongodb_backend.fields.ObjectIdAutoField"
DATABASE_ROUTERS = ["django_mongodb_backend.routers.MongoRouter"]


INSTALLED_APPS = [
    "workflow_engine.mongo_contrib.MongoAdminConfig",
    "workflow_engine.mongo_contrib.MongoAuthConfig",
    "workflow_engine.mongo_contrib.MongoContentTypesConfig",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "rest_framework.authtoken",
    # "django_fsm_log",
    "apps.accounts.apps.AccountsConfig",
    "apps.workflows.apps.WorkflowsConfig",
    "apps.integrations.apps.IntegrationsConfig",
    'apps.admin.apps.AdminConfig',
]


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "workflow_engine.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.debug",
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "workflow_engine.wsgi.application"
MIGRATION_MODULES = {
    "admin": "mongo_migrations.admin",
    "auth": "mongo_migrations.auth",
    "contenttypes": "mongo_migrations.contenttypes",
}

# ==== MongoDB as default ====
MONGO_NAME = os.getenv("MONGO_DB", "office")
MONGO_URI  = os.getenv("MONGO_URI")
MONGO_HOST = os.getenv("MONGO_HOST", "127.0.0.1")
MONGO_PORT = int(os.getenv("MONGO_PORT", "27017"))
MONGO_USER = os.getenv("MONGO_USER", "")
MONGO_PASS = os.getenv("MONGO_PASSWORD", "")

DATABASES = {
    "default": {
        "ENGINE": "django_mongodb_backend",
        "NAME": MONGO_NAME,
        **(
            {"HOST": MONGO_URI}
            if MONGO_URI else {
                "HOST": MONGO_HOST,
                "PORT": MONGO_PORT,
                "USER": MONGO_USER,
                "PASSWORD": MONGO_PASS,
                "OPTIONS": {"retryWrites": "true", "w": "majority"}
            }
        )
    }
}
DEFAULT_AUTO_FIELD = "django_mongodb_backend.fields.ObjectIdAutoField"
DATABASE_ROUTERS = ["django_mongodb_backend.routers.MongoRouter"]

# ==== Files: MinIO via django-storages ====
INSTALLED_APPS += ["storages"]
AWS_S3_ENDPOINT_URL = os.getenv("MINIO_ENDPOINT", "http://127.0.0.1:9000")
AWS_ACCESS_KEY_ID = os.getenv("MINIO_ACCESS_KEY", "minio")
AWS_SECRET_ACCESS_KEY = os.getenv("MINIO_SECRET_KEY", "minio123")
AWS_STORAGE_BUCKET_NAME = os.getenv("MINIO_BUCKET", "attachments")
AWS_S3_REGION_NAME = "us-east-1"
AWS_S3_ADDRESSING_STYLE = "path"
AWS_S3_SIGNATURE_VERSION = "s3v4"
AWS_S3_VERIFY = os.getenv("MINIO_USE_SSL","0") == "1"
DEFAULT_FILE_STORAGE = "storages.backends.s3boto3.S3Boto3Storage"

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "static"

# ==== DRF + JWT ====
REST_FRAMEWORK = {
    # ...
    "DEFAULT_RENDERER_CLASSES": [
        "workflow_engine.encoders.MongoJSONRenderer",  # <= use custom encoder
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "SIGNING_KEY": os.getenv("JWT_AUTH_SECRET", "jwt-auth-secret"),
    "ALGORITHM": os.getenv("JWT_SIGN_ALG", "HS256"),
}

# ==== CORS ====
CORS_ALLOW_ALL_ORIGINS = True

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True
