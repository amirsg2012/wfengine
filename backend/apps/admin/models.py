# backend/apps/admin/models.py
from django.db import models
from django.utils import timezone

class SystemLog(models.Model):
    LEVEL_CHOICES = [
        ('DEBUG', 'Debug'),
        ('INFO', 'Info'),
        ('SUCCESS', 'Success'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('CRITICAL', 'Critical'),
    ]
    
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('EXPORT', 'Export'),
        ('IMPORT', 'Import'),
        ('ERROR', 'Error'),
        ('ACCESS', 'Access'),
    ]
    
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='INFO')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='INFO')
    message = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    user = models.CharField(max_length=150, blank=True, null=True)  # Username string
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    details = models.JSONField(blank=True, null=True)  # Additional structured data
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['level', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['user', 'created_at']),
        ]
    
    def __str__(self):
        return f"{self.level}: {self.message}"

# Helper function to create system logs
def create_system_log(level, action, message, description='', user=None, ip_address=None, details=None):
    """
    Helper function to create system logs
    
    Args:
        level: Log level (DEBUG, INFO, SUCCESS, WARNING, ERROR, CRITICAL)
        action: Action type (CREATE, UPDATE, DELETE, etc.)
        message: Short message describing the action
        description: Detailed description (optional)
        user: Username or User object (optional)
        ip_address: IP address (optional)
        details: Additional structured data as dict (optional)
    """
    user_name = None
    if user:
        if hasattr(user, 'username'):
            user_name = user.username
        else:
            user_name = str(user)
    
    return SystemLog.objects.create(
        level=level,
        action=action,
        message=message,
        description=description,
        user=user_name,
        ip_address=ip_address,
        details=details
    )