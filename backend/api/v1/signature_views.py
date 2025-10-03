# backend/api/v1/signature_views.py
"""
API views for digital signature management
"""
from rest_framework import viewsets, decorators, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404

from apps.accounts.signature_models import UserSignature, SignatureLog
from apps.accounts.signature_utils import (
    get_user_signature,
    has_signature,
    apply_signature_to_form,
    verify_signature_on_form,
    get_form_signatures
)
from apps.workflows.models import Workflow
from .serializers_signatures import UserSignatureSerializer, SignatureLogSerializer


class UserSignatureViewSet(viewsets.ViewSet):
    """
    ViewSet for managing user signatures
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    @decorators.action(detail=False, methods=['get'])
    def my_signature(self, request):
        """Get current user's signature"""
        signature = get_user_signature(request.user)

        if not signature:
            return Response({
                'has_signature': False,
                'message': 'No signature uploaded'
            })

        return Response({
            'has_signature': True,
            'signature_url': signature.signature_url,
            'uploaded_at': signature.uploaded_at.isoformat(),
            'signature_hash': signature.signature_hash
        })

    @decorators.action(detail=False, methods=['post'])
    def upload(self, request):
        """Upload or update user's signature"""
        if 'signature' not in request.FILES:
            return Response({
                'error': 'no_file',
                'message': 'No signature file provided'
            }, status=status.HTTP_400_BAD_REQUEST)

        signature_file = request.FILES['signature']

        # Validate file type
        allowed_types = ['image/png', 'image/jpeg', 'image/jpg']
        if signature_file.content_type not in allowed_types:
            return Response({
                'error': 'invalid_file_type',
                'message': f'Only PNG and JPEG images allowed. Got: {signature_file.content_type}'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate file size (max 2MB)
        max_size = 2 * 1024 * 1024  # 2MB
        if signature_file.size > max_size:
            return Response({
                'error': 'file_too_large',
                'message': f'File size must be less than 2MB. Got: {signature_file.size / 1024 / 1024:.2f}MB'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Delete old signature if exists
        UserSignature.objects.filter(user=request.user).delete()

        # Create new signature
        signature = UserSignature.objects.create(
            user=request.user,
            signature_image=signature_file,
            is_active=True
        )

        return Response({
            'success': True,
            'message': 'Signature uploaded successfully',
            'signature_url': signature.signature_url,
            'signature_hash': signature.signature_hash
        }, status=status.HTTP_201_CREATED)

    @decorators.action(detail=False, methods=['delete'])
    def delete(self, request):
        """Delete user's signature"""
        deleted_count, _ = UserSignature.objects.filter(user=request.user).delete()

        if deleted_count == 0:
            return Response({
                'error': 'no_signature',
                'message': 'No signature to delete'
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'message': 'Signature deleted successfully'
        })


class WorkflowSignatureViewSet(viewsets.ViewSet):
    """
    ViewSet for applying signatures to workflows
    """
    permission_classes = [permissions.IsAuthenticated]

    @decorators.action(detail=True, methods=['post'])
    def apply_signature(self, request, pk=None):
        """
        Apply user's signature to a form field

        Request body:
        {
            "form_number": 2,
            "field_path": "agreement.signatureUrl"
        }
        """
        workflow = get_object_or_404(Workflow, pk=pk)

        form_number = request.data.get('form_number')
        field_path = request.data.get('field_path')

        if not form_number or not field_path:
            return Response({
                'error': 'missing_parameters',
                'message': 'form_number and field_path are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Apply signature
        result = apply_signature_to_form(
            user=request.user,
            workflow=workflow,
            form_number=form_number,
            field_path=field_path,
            request=request
        )

        if 'error' in result:
            return Response(result, status=status.HTTP_400_BAD_REQUEST)

        # Update workflow data with signature
        data = workflow.data.copy()

        # Navigate to the field and set signature data
        keys = field_path.split('.')
        current = data

        # Create nested structure if doesn't exist
        for key in keys[:-1]:
            if key not in current:
                current[key] = {}
            current = current[key]

        # Set signature object
        signature_field_base = keys[-1].replace('Url', '').replace('url', '')  # Get base name
        parent_key = keys[-2] if len(keys) > 1 else None

        if parent_key and isinstance(current, dict):
            # Set all signature fields
            current[signature_field_base + 'Url'] = result['signature_url']
            current[signature_field_base + 'Hash'] = result['signature_hash']
            current[signature_field_base + 'SignedBy'] = request.user.username
            current[signature_field_base + 'SignedAt'] = result['signed_at']

        workflow.data = data
        workflow.save(update_fields=['_data'])

        return Response({
            'success': True,
            'message': 'Signature applied successfully',
            **result
        })

    @decorators.action(detail=True, methods=['get'])
    def verify_signature(self, request, pk=None):
        """
        Verify a signature on a form field

        Query params:
        - form_number: Form number
        - field_path: Field path
        """
        workflow = get_object_or_404(Workflow, pk=pk)

        form_number = request.query_params.get('form_number')
        field_path = request.query_params.get('field_path')

        if not form_number or not field_path:
            return Response({
                'error': 'missing_parameters',
                'message': 'form_number and field_path are required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            form_number = int(form_number)
        except ValueError:
            return Response({
                'error': 'invalid_form_number',
                'message': 'form_number must be an integer'
            }, status=status.HTTP_400_BAD_REQUEST)

        result = verify_signature_on_form(workflow, form_number, field_path)

        return Response(result)

    @decorators.action(detail=True, methods=['get'])
    def form_signatures(self, request, pk=None):
        """Get all signatures for a specific form in workflow"""
        workflow = get_object_or_404(Workflow, pk=pk)

        form_number = request.query_params.get('form_number')

        if not form_number:
            return Response({
                'error': 'missing_parameters',
                'message': 'form_number is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            form_number = int(form_number)
        except ValueError:
            return Response({
                'error': 'invalid_form_number',
                'message': 'form_number must be an integer'
            }, status=status.HTTP_400_BAD_REQUEST)

        signatures = get_form_signatures(workflow, form_number)

        return Response({
            'form_number': form_number,
            'workflow_id': str(workflow.pk),
            'signatures': signatures
        })

    @decorators.action(detail=True, methods=['get'])
    def signature_logs(self, request, pk=None):
        """Get all signature logs for a workflow"""
        workflow = get_object_or_404(Workflow, pk=pk)

        logs = SignatureLog.objects.filter(workflow=workflow).select_related('user')
        serializer = SignatureLogSerializer(logs, many=True)

        return Response({
            'workflow_id': str(workflow.pk),
            'logs': serializer.data
        })
