# Create: backend/apps/workflows/mongo_fsm_log.py

from django.db import models
from django_fsm_log.models import StateLog as BaseStateLog


class StateLog(BaseStateLog):
    """MongoDB-compatible StateLog model"""
    
    # Override the object_id field to work with ObjectIds
    object_id = models.CharField(max_length=24)  # ObjectId is 24 chars
    
    class Meta:
        db_table = 'django_fsm_log_statelog'
        app_label = 'django_fsm_log'


# Override the django-fsm-log models
import django_fsm_log.models
django_fsm_log.models.StateLog = StateLog