# backend/api/v1/serializers_signatures.py
"""
Serializers for signature models
"""
from rest_framework import serializers
from apps.accounts.signature_models import UserSignature, SignatureLog


class UserSignatureSerializer(serializers.ModelSerializer):
    """Serializer for user signatures"""
    id = serializers.SerializerMethodField()
    user = serializers.CharField(source='user.username', read_only=True)
    signature_url = serializers.SerializerMethodField()

    class Meta:
        model = UserSignature
        fields = ['id', 'user', 'signature_url', 'uploaded_at', 'updated_at', 'signature_hash', 'is_active']
        read_only_fields = ['id', 'uploaded_at', 'updated_at', 'signature_hash']

    def get_id(self, obj):
        return str(obj.pk)

    def get_signature_url(self, obj):
        return obj.signature_url


class SignatureLogSerializer(serializers.ModelSerializer):
    """Serializer for signature logs"""
    id = serializers.SerializerMethodField()
    user = serializers.CharField(source='user.username', read_only=True)
    workflow_id = serializers.SerializerMethodField()

    class Meta:
        model = SignatureLog
        fields = [
            'id', 'user', 'workflow_id', 'form_number', 'field_path',
            'signature_url', 'signature_hash', 'signed_at',
            'ip_address', 'is_verified'
        ]

    def get_id(self, obj):
        return str(obj.pk)

    def get_workflow_id(self, obj):
        return str(obj.workflow.pk) if obj.workflow else None
