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
    Each user can have one active signature at a time.
    """
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='signature',
        help_text="User who owns this signature"
    )

    # Signature image stored in MinIO
    signature_image = models.ImageField(
        upload_to='signatures/',
        storage=S3Boto3Storage(),
        help_text="Digital signature image (PNG with transparent background preferred)"
    )

    # Metadata
    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

    # Signature verification hash (for integrity)
    signature_hash = models.CharField(
        max_length=64,
        blank=True,
        help_text="SHA256 hash of signature image for verification"
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
        """Generate signature hash on save"""
        if self.signature_image:
            import hashlib
            # Read file and generate hash
            self.signature_image.seek(0)
            file_content = self.signature_image.read()
            self.signature_hash = hashlib.sha256(file_content).hexdigest()
            self.signature_image.seek(0)

        super().save(*args, **kwargs)

    @property
    def signature_url(self):
        """Get the URL of the signature image"""
        if self.signature_image:
            return self.signature_image.url
        return None

    def verify_integrity(self):
        """Verify signature image hasn't been tampered with"""
        if not self.signature_image or not self.signature_hash:
            return False

        import hashlib
        self.signature_image.seek(0)
        file_content = self.signature_image.read()
        current_hash = hashlib.sha256(file_content).hexdigest()
        self.signature_image.seek(0)

        return current_hash == self.signature_hash


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
    signature_url = models.URLField(help_text="URL of signature image at time of signing")
    signature_hash = models.CharField(max_length=64, help_text="Hash for verification")

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
