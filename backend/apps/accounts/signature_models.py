# apps/accounts/signature_models.py
"""
Digital Signature models for users
"""
from django.db import models
from django.conf import settings
from storages.backends.s3boto3 import S3Boto3Storage


class UserSignature(models.Model):
    """
    Digital signature for users.
    Each user has a unique cryptographic signature hash that represents their identity.
    No image upload required - hash is automatically generated.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='signature',
        help_text="User who owns this signature"
    )

    # Signature image stored in MinIO (DEPRECATED - keeping for backward compatibility)
    signature_image = models.ImageField(
        upload_to='signatures/',
        storage=S3Boto3Storage(),
        null=True,
        blank=True,
        help_text="DEPRECATED: Digital signature is now hash-based"
    )

    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    # Unique cryptographic signature hash for this user
    signature_hash = models.CharField(
        max_length=64,
        unique=True,
        help_text="Unique SHA256 hash representing user's digital signature"
    )

    class Meta:
        verbose_name = "User Signature"
        verbose_name_plural = "User Signatures"
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]

    def __str__(self):
        return f"Signature for {self.user.username}"

    def save(self, *args, **kwargs):
        """Generate unique signature hash on creation"""
        if not self.signature_hash:
            import hashlib
            import uuid
            # Generate unique hash based on user ID and UUID
            unique_string = f"{self.user.id}-{self.user.username}-{uuid.uuid4()}"
            self.signature_hash = hashlib.sha256(unique_string.encode()).hexdigest()

        super().save(*args, **kwargs)

    @property
    def signature_url(self):
        """DEPRECATED: Returns None as signatures are now hash-based"""
        return None

    def get_display_hash(self):
        """Get shortened hash for display (first 8 characters)"""
        return self.signature_hash[:8] if self.signature_hash else ""

    def verify_integrity(self):
        """Verify signature hash exists and is valid"""
        return bool(self.signature_hash and len(self.signature_hash) == 64)


class SignatureLog(models.Model):
    """
    Audit log for signature usage in workflows
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name='signature_logs'
    )

    workflow = models.ForeignKey(
        'workflows.Workflow',
        on_delete=models.CASCADE,
        related_name='signature_logs'
    )

    form_number = models.IntegerField(help_text="Form number where signature was applied")
    field_path = models.CharField(
        max_length=255,
        help_text="JSON path to signature field (e.g., 'agreement.signature')"
    )

    # Signature data at time of signing
    signature_url = models.URLField(null=True, blank=True, help_text="DEPRECATED: No longer used")
    signature_hash = models.CharField(max_length=64, help_text="User's signature hash at time of signing")

    # Metadata
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    # Verification status
    is_verified = models.BooleanField(
        default=True,
        help_text="Whether signature was verified at time of application"
    )

    class Meta:
        verbose_name = "Signature Log"
        verbose_name_plural = "Signature Logs"
        ordering = ['-signed_at']
        indexes = [
            models.Index(fields=['workflow', 'form_number']),
            models.Index(fields=['user', 'signed_at']),
        ]

    def __str__(self):
        return f"{self.user.username} signed Form {self.form_number} on {self.signed_at}"
