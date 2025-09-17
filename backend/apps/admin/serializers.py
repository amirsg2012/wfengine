# backend/apps/admin/serializers.py
from rest_framework import serializers
from .models import SystemLog

class SystemLogSerializer(serializers.ModelSerializer):
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = SystemLog
        fields = [
            'id',
            'level',
            'action', 
            'message',
            'description',
            'user',
            'ip_address',
            'details',
            'timestamp'
        ]
        read_only_fields = fields