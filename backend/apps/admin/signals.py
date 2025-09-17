# backend/apps/admin/signals.py
from django.db.models.signals import post_save, post_delete
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from apps.workflows.models import Workflow
from .models import create_system_log

User = get_user_model()

@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    """Log user login events"""
    ip_address = get_client_ip(request)
    create_system_log(
        level='INFO',
        action='LOGIN',
        message=f'\u06a9\u0627\u0631\u0628\u0631 \u0648\u0627\u0631\u062f \u0633\u06cc\u0633\u062a\u0645 \u0634\u062f',
        description=f'\u06a9\u0627\u0631\u0628\u0631 "{user.username}" \u0648\u0627\u0631\u062f \u0633\u06cc\u0633\u062a\u0645 \u0634\u062f',
        user=user,
        ip_address=ip_address
    )

@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    """Log user logout events"""
    if user:
        ip_address = get_client_ip(request)
        create_system_log(
            level='INFO',
            action='LOGOUT',
            message=f'\u06a9\u0627\u0631\u0628\u0631 \u0627\u0632 \u0633\u06cc\u0633\u062a\u0645 \u062e\u0627\u0631\u062c \u0634\u062f',
            description=f'\u06a9\u0627\u0631\u0628\u0631 "{user.username}" \u0627\u0632 \u0633\u06cc\u0633\u062a\u0645 \u062e\u0627\u0631\u062c \u0634\u062f',
            user=user,
            ip_address=ip_address
        )

@receiver(post_save, sender=Workflow)
def log_letter_changes(sender, instance, created, **kwargs):
    """Log letter creation and updates"""
    if created:
        create_system_log(
            level='SUCCESS',
            action='CREATE',
            message='\u062f\u0631\u062e\u0648\u0627\u0633\u062a \u062c\u062f\u06cc\u062f \u0627\u06cc\u062c\u0627\u062f \u0634\u062f',
            description=f'\u062f\u0631\u062e\u0648\u0627\u0633\u062a "{instance.title}" \u062a\u0648\u0633\u0637 {instance.created_by} \u0627\u06cc\u062c\u0627\u062f \u0634\u062f',
            user=instance.created_by,
            details={
                'letter_id': str(instance.id),
                'title': instance.title,
                'state': instance.state
            }
        )
    else:
        create_system_log(
            level='INFO',
            action='UPDATE',
            message='\u062f\u0631\u062e\u0648\u0627\u0633\u062a \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0634\u062f',
            description=f'\u062f\u0631\u062e\u0648\u0627\u0633\u062a "{instance.title}" \u0628\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06cc \u0634\u062f',
            details={
                'letter_id': str(instance.id),
                'title': instance.title,
                'state': instance.state
            }
        )

def get_client_ip(request):
    """Helper function to get client IP address"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip