# apps/accounts/signature_utils.py
"""
Utilities for digital signature operations
"""
from typing import Optional, Dict, Any
from django.contrib.auth import get_user_model
from .signature_models import UserSignature, SignatureLog

User = get_user_model()


def get_user_signature(user) -> Optional[UserSignature]:
    """
    Get active signature for user

    Args:
        user: User instance

    Returns:
        UserSignature instance or None
    """
    try:
        return UserSignature.objects.get(user=user, is_active=True)
    except UserSignature.DoesNotExist:
        return None


def has_signature(user) -> bool:
    """Check if user has an active signature"""
    return UserSignature.objects.filter(user=user, is_active=True).exists()


def apply_signature_to_form(
    user,
    workflow,
    form_number: int,
    field_path: str,
    request=None
) -> Dict[str, Any]:
    """
    Apply user's digital signature to a form field

    Args:
        user: User instance
        workflow: Workflow instance
        form_number: Form number
        field_path: JSON path to signature field
        request: Optional request object for IP/user agent

    Returns:
        Dict with signature data and status
    """
    # Check if user has signature
    signature = get_user_signature(user)

    if not signature:
        return {
            "error": "no_signature",
            "message": "User does not have a signature uploaded"
        }

    # Verify signature integrity
    if not signature.verify_integrity():
        return {
            "error": "signature_corrupted",
            "message": "Signature integrity verification failed"
        }

    # Get signature URL
    signature_url = signature.signature_url

    # Create signature log entry
    log_data = {
        'user': user,
        'workflow': workflow,
        'form_number': form_number,
        'field_path': field_path,
        'signature_url': signature_url,
        'signature_hash': signature.signature_hash,
        'is_verified': True
    }

    if request:
        # Get IP address
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        log_data['ip_address'] = ip

        # Get user agent
        log_data['user_agent'] = request.META.get('HTTP_USER_AGENT', '')

    SignatureLog.objects.create(**log_data)

    return {
        "success": True,
        "signature_url": signature_url,
        "signature_hash": signature.signature_hash,
        "signed_at": signature.updated_at.isoformat()
    }


def verify_signature_on_form(
    workflow,
    form_number: int,
    field_path: str
) -> Dict[str, Any]:
    """
    Verify a signature applied to a form

    Args:
        workflow: Workflow instance
        form_number: Form number
        field_path: JSON path to signature field

    Returns:
        Dict with verification status
    """
    # Get signature log entry
    try:
        log = SignatureLog.objects.filter(
            workflow=workflow,
            form_number=form_number,
            field_path=field_path
        ).latest('signed_at')

        # Get current signature for user
        current_signature = get_user_signature(log.user)

        if not current_signature:
            return {
                "verified": False,
                "error": "signature_not_found",
                "message": "User's signature no longer exists"
            }

        # Check if hash matches
        if current_signature.signature_hash != log.signature_hash:
            return {
                "verified": False,
                "error": "signature_changed",
                "message": "User's signature has been changed since signing"
            }

        # Check signature integrity
        if not current_signature.verify_integrity():
            return {
                "verified": False,
                "error": "signature_corrupted",
                "message": "Signature integrity check failed"
            }

        return {
            "verified": True,
            "signed_by": log.user.username,
            "signed_at": log.signed_at.isoformat(),
            "signature_url": log.signature_url
        }

    except SignatureLog.DoesNotExist:
        return {
            "verified": False,
            "error": "no_signature_log",
            "message": "No signature found for this field"
        }


def get_signature_logs_for_workflow(workflow) -> list:
    """Get all signature logs for a workflow"""
    return SignatureLog.objects.filter(workflow=workflow).select_related('user')


def get_form_signatures(workflow, form_number: int) -> Dict[str, Any]:
    """
    Get all signatures applied to a specific form

    Returns:
        Dict mapping field_path to signature info
    """
    logs = SignatureLog.objects.filter(
        workflow=workflow,
        form_number=form_number
    ).select_related('user')

    signatures = {}
    for log in logs:
        signatures[log.field_path] = {
            'signed_by': log.user.username,
            'signed_at': log.signed_at.isoformat(),
            'signature_url': log.signature_url,
            'is_verified': log.is_verified
        }

    return signatures
